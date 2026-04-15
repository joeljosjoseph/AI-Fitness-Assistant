import fs from "node:fs";
import path from "node:path";
import { parseCsvLine } from "@/lib/parseCsvLine";

let cachedIndex = null;

function normGender(g) {
    const s = String(g || "").trim();
    if (s.toLowerCase() === "male") return "Male";
    if (s.toLowerCase() === "female") return "Female";
    return "Female";
}

/** UI / API goal -> GYM.csv Goal column */
export function uiGoalToCsvGoal(goal) {
    const s = String(goal || "").trim();
    if (s === "Lose Weight") return "fat_burn";
    if (s === "Build Muscle") return "muscle_gain";
    if (s === "Get Fit" || s === "Improve Endurance") return "muscle_gain";
    return "muscle_gain";
}

/** Our bmi_category -> GYM.csv "BMI Category" */
export function bmiCategoryToCsv(bmiCategory) {
    const s = String(bmiCategory || "").trim();
    if (s === "Normal") return "Normal weight";
    if (s === "Obese") return "Obesity";
    return s;
}

function buildIndex() {
    const csvPath = path.join(process.cwd(), "GYM.csv");
    if (!fs.existsSync(csvPath)) {
        return new Map();
    }
    const raw = fs.readFileSync(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    const index = new Map();

    for (let li = 1; li < lines.length; li++) {
        const fields = parseCsvLine(lines[li]);
        if (fields.length < 5) continue;
        const [gender, goal, bmiCat, exercise, meal] = fields;
        const key = `${gender}|${goal}|${bmiCat}`;
        if (!index.has(key)) {
            index.set(key, {
                gender,
                goal,
                bmiCategory: bmiCat,
                exerciseSchedule: exercise,
                mealPlan: meal,
            });
        }
    }

    return index;
}

export function getGymIndex() {
    if (!cachedIndex) cachedIndex = buildIndex();
    return cachedIndex;
}

/**
 * @param {{ gender: string, uiGoal: string, bmiCategory: string }} spec
 */
export function lookupGymRow(spec) {
    const index = getGymIndex();
    const g = normGender(spec.gender);
    const csvGoal = uiGoalToCsvGoal(spec.uiGoal);
    const csvBmi = bmiCategoryToCsv(spec.bmiCategory);
    const key = `${g}|${csvGoal}|${csvBmi}`;
    let row = index.get(key);
    if (!row && spec.gender && String(spec.gender).toLowerCase() === "other") {
        row = index.get(`Female|${csvGoal}|${csvBmi}`) || index.get(`Male|${csvGoal}|${csvBmi}`);
    }
    if (!row) {
        const altGender = g === "Male" ? "Female" : "Male";
        row = index.get(`${altGender}|${csvGoal}|${csvBmi}`);
    }
    if (!row) {
        row = index.get(`${g}|muscle_gain|Normal weight`) || index.get(`Male|muscle_gain|Normal weight`);
    }
    return row || null;
}

export function resetGymIndexForTests() {
    cachedIndex = null;
}
