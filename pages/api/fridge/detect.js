import fs from "node:fs";
import formidable from "formidable";
import { connectDB } from "@/lib/mongodb";
import { getLocalModelBaseUrl, requestFastApi } from "@/lib/fastApiClient";
import User from "@/models/User";
import { findNutritionForItem } from "@/lib/nutritionLookup";

/**
 * @param {unknown} data
 * @returns { { name: string, count: number }[] }
 */
function localDetectResponseToFridgeItems(data) {
    const list = data?.detected_items;
    if (!Array.isArray(list) || list.length === 0) {
        return [];
    }
    const byKey = new Map();
    for (const raw of list) {
        if (raw == null) continue;
        const name = String(raw).trim();
        const key = name.toLowerCase();
        if (!key) continue;
        if (!byKey.has(key)) {
            byKey.set(key, { name, count: 0 });
        }
        byKey.get(key).count += 1;
    }
    return Array.from(byKey.values());
}

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

/**
 * @param {import("formidable").File} imageFile
 * @returns {Promise<{ name: string, count: number }[]>}
 */
async function runDetector(imageFile) {
    const bytes = fs.readFileSync(imageFile.filepath);
    const formData = new FormData();
    const blob = new Blob([bytes], {
        type: imageFile.mimetype || "application/octet-stream",
    });

    formData.append(
        "image",
        blob,
        imageFile.originalFilename || "fridge-upload.jpg"
    );
    formData.append("conf", "0.25");

    const useLocal = process.env.USE_LOCAL_MODEL === "true";
    if (useLocal) {
        const baseUrl = getLocalModelBaseUrl();
        const res = await fetch(`${baseUrl}/detect`, {
            method: "POST",
            body: formData,
        });
        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const message =
                errBody.detail ||
                errBody.error ||
                `Local detector request failed with status ${res.status}`;
            throw new Error(
                typeof message === "string" ? message : JSON.stringify(message)
            );
        }
        const data = await res.json();
        return localDetectResponseToFridgeItems(data);
    }

    const response = await requestFastApi("/fridge/detect", {
        method: "POST",
        body: formData,
    });
    const data = await response.json();
    return Array.isArray(data?.items) ? data.items : [];
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

        const detections = await runDetector(imageFile);

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
