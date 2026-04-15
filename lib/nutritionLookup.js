import fs from "node:fs";
import path from "node:path";

let cachedRows = null;

function normalizeName(value = "") {
    return String(value)
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .replace(/\([^)]*\)/g, " ")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function parseCsvLine(line) {
    const out = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === "\"") {
            inQuotes = !inQuotes;
            continue;
        }
        if (ch === "," && !inQuotes) {
            out.push(current.trim());
            current = "";
            continue;
        }
        current += ch;
    }
    out.push(current.trim());
    return out;
}

function loadNutritionRows() {
    if (cachedRows) return cachedRows;
    const csvPath = path.join(process.cwd(), "archive", "daily_food_nutrition_dataset.csv");
    if (!fs.existsSync(csvPath)) {
        cachedRows = [];
        return cachedRows;
    }
    const raw = fs.readFileSync(csvPath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const rows = [];
    for (let i = 1; i < lines.length; i += 1) {
        const cols = parseCsvLine(lines[i]);
        if (!cols[0]) continue;
        rows.push({
            foodItem: cols[0],
            category: cols[1] || "",
            calories: cols[2] || "",
            protein: cols[3] || "",
            carbs: cols[4] || "",
            fat: cols[5] || "",
            fiber: cols[6] || "",
            sugars: cols[7] || "",
        });
    }
    cachedRows = rows;
    return rows;
}

export function findNutritionForItem(itemName) {
    const rows = loadNutritionRows();
    const target = normalizeName(itemName);
    const exact = rows.find((r) => normalizeName(r.foodItem) === target);
    if (exact) return exact;
    const contains = rows.find(
        (r) => normalizeName(r.foodItem).includes(target) || target.includes(normalizeName(r.foodItem))
    );
    return contains || null;
}
