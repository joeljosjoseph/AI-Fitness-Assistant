/**
 * Parse one CSV line with optional "double-quoted" fields (commas inside quotes).
 */
export function parseCsvLine(line) {
    const fields = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (c === "," && !inQuotes) {
            fields.push(cur);
            cur = "";
            continue;
        }
        cur += c;
    }
    fields.push(cur);
    return fields.map((f) => f.trim());
}
