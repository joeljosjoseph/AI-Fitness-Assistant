import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import formidable from "formidable";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { findNutritionForItem } from "@/lib/nutritionLookup";

export const config = {
    api: {
        bodyParser: false,
    },
};

function parseForm(req) {
    const form = formidable({ multiples: false, keepExtensions: true });
    return new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });
}

function runDetector({ modelPath, imagePath }) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), "ml_api", "fridge_detect_infer.py");
        const py = spawn("python", [
            scriptPath,
            "--model",
            modelPath,
            "--image",
            imagePath,
            "--conf",
            "0.25",
        ]);

        let stdout = "";
        let stderr = "";
        py.stdout.on("data", (d) => {
            stdout += d.toString();
        });
        py.stderr.on("data", (d) => {
            stderr += d.toString();
        });
        py.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(stderr || `Detector exited with code ${code}`));
                return;
            }
            const line = stdout
                .split(/\r?\n/)
                .reverse()
                .find((l) => l.startsWith("JSON_RESULT:"));
            if (!line) {
                reject(new Error("Detector returned no parseable JSON output."));
                return;
            }
            try {
                resolve(JSON.parse(line.replace("JSON_RESULT:", "")));
            } catch {
                reject(new Error("Failed to parse detector JSON output."));
            }
        });
    });
}

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, error: "Only POST allowed" });
    }

    let uploadedPath = null;
    try {
        await connectDB();
        const { fields, files } = await parseForm(req);
        const userId = fields.userId?.[0] || fields.userId;
        if (!userId) {
            return res.status(400).json({ success: false, error: "userId is required" });
        }
        const image = files.image;
        const imageFile = Array.isArray(image) ? image[0] : image;
        if (!imageFile?.filepath) {
            return res.status(400).json({ success: false, error: "image file is required" });
        }
        uploadedPath = imageFile.filepath;

        const modelPath = path.join(
            process.cwd(),
            "backend",
            "runs",
            "detect",
            "smart_fridge_train",
            "weights",
            "best.pt"
        );
        if (!fs.existsSync(modelPath)) {
            return res.status(404).json({
                success: false,
                error: `Model not found at ${modelPath}`,
            });
        }

        const detections = await runDetector({
            modelPath,
            imagePath: uploadedPath,
        });

        const items = detections.map((d) => ({
            name: d.name,
            count: d.count,
            source: "detected",
            nutrition: findNutritionForItem(d.name),
        }));

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, error: "User not found" });

        const existing = user.fridge?.items || [];
        const merged = new Map();
        [...existing, ...items].forEach((it) => {
            const key = String(it.name || "").toLowerCase().trim();
            if (!key) return;
            if (!merged.has(key)) {
                merged.set(key, { ...it, name: it.name, count: Number(it.count || 0) });
            } else {
                const prev = merged.get(key);
                prev.count += Number(it.count || 0);
                if (!prev.nutrition && it.nutrition) prev.nutrition = it.nutrition;
                if (it.source === "manual") prev.source = "manual";
                merged.set(key, prev);
            }
        });

        user.fridge = {
            ...(user.fridge || {}),
            lastDetectedImageAt: new Date(),
            items: Array.from(merged.values()),
        };
        await user.save();

        return res.status(200).json({
            success: true,
            items: user.fridge.items,
            detectedItems: items,
        });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    } finally {
        if (uploadedPath && fs.existsSync(uploadedPath)) {
            try {
                fs.unlinkSync(uploadedPath);
            } catch {
                // ignore temp cleanup errors
            }
        }
    }
}
