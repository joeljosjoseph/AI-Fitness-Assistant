import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

/**
 * Run sklearn diet RF (ml_diet). Same pattern as fridge_detect_infer.py.
 * @param {{ gender: string, goal: string, weight_kg: number, height_cm: number }} payload
 * @returns {Promise<null | { exercise_schedule: string, meal_plan_focus: string, csv_goal: string, csv_bmi_category: string, bmi_used: number }>}
 */
export function runDietMlInfer(payload) {
    return new Promise((resolve) => {
        const tmp = path.join(os.tmpdir(), `diet-ml-${Date.now()}-${Math.random().toString(16).slice(2)}.json`);
        try {
            fs.writeFileSync(tmp, JSON.stringify(payload), "utf8");
        } catch {
            resolve(null);
            return;
        }

        const py = spawn("python", ["-m", "ml_diet.diet_predict_infer", tmp], {
            cwd: process.cwd(),
            windowsHide: true,
        });

        let stdout = "";
        let stderr = "";
        py.stdout.on("data", (d) => {
            stdout += d.toString();
        });
        py.stderr.on("data", (d) => {
            stderr += d.toString();
        });

        py.on("close", () => {
            try {
                fs.unlinkSync(tmp);
            } catch {
                // ignore
            }

            const line = stdout
                .split(/\r?\n/)
                .reverse()
                .find((l) => l.startsWith("JSON_RESULT:"));
            if (!line) {
                if (stderr) console.warn("[diet-ml]", stderr.slice(0, 500));
                resolve(null);
                return;
            }
            try {
                const data = JSON.parse(line.replace("JSON_RESULT:", ""));
                if (!data.ok) {
                    resolve(null);
                    return;
                }
                resolve({
                    exercise_schedule: data.exercise_schedule,
                    meal_plan_focus: data.meal_plan_focus,
                    csv_goal: data.csv_goal,
                    csv_bmi_category: data.csv_bmi_category,
                    bmi_used: data.bmi_used,
                });
            } catch {
                resolve(null);
            }
        });

        py.on("error", () => {
            try {
                fs.unlinkSync(tmp);
            } catch {
                // ignore
            }
            resolve(null);
        });
    });
}
