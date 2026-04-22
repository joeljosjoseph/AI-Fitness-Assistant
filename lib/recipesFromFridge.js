/**
 * Build simple recipe cards from fridge items, GYM meal-plan hints, and BMI/goal context.
 * @param {Array<{ name: string, count?: number }>} fridgeItems
 * @param {string|null} gymMealPlan
 * @param {{ bmi_category: string, goal: string, calories: number, protein: number }} ctx
 */
export function buildFridgeRecipes(fridgeItems, gymMealPlan, ctx) {
    const items = (fridgeItems || [])
        .map((x) => ({
            name: String(x?.name || "").trim(),
            count: Number(x?.count || 1) || 1,
        }))
        .filter((x) => x.name.length > 0);

    if (!items.length) return [];

    const planLower = (gymMealPlan || "").toLowerCase();
    const ingredientsFromGym = extractGymFoods(gymMealPlan);

    const recipes = [];

    for (const it of items) {
        const n = it.name.toLowerCase();
        const inGymPlan =
            planLower.includes(n) ||
            ingredientsFromGym.some((g) => g.includes(n) || n.includes(g.replace(/\s+/g, "")));

        const tpl = pickTemplate(it.name, ctx);
        if (!tpl) continue;

        recipes.push({
            title: `${tpl.titlePrefix} ${it.name}`,
            usesFridge: [it.name],
            ingredients: uniqueList([
                `${it.name} (you have ×${it.count})`,
                ...tpl.pantry.slice(0, 3),
            ]),
            steps: tpl.steps(ctx),
            note: inGymPlan
                ? "Aligned with your GYM meal-plan focus."
                : "Uses what you have on hand; adjust portions to your calorie target.",
        });
        if (recipes.length >= 8) break;
    }

    return recipes;
}

function extractGymFoods(mealPlan) {
    if (!mealPlan) return [];
    const idx = mealPlan.lastIndexOf(":");
    const tail = idx >= 0 ? mealPlan.slice(idx + 1) : mealPlan;
    return tail
        .split(/[,;]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
}

function uniqueList(arr) {
    const seen = new Set();
    return arr.filter((x) => {
        const k = x.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

function pickTemplate(name, ctx) {
    const n = name.toLowerCase();
    const lowCal = ctx.bmi_category === "Overweight" || ctx.bmi_category === "Obese" || ctx.goal === "Lose Weight";

    if (/egg/.test(n)) {
        return {
            titlePrefix: lowCal ? "Light" : "Hearty",
            pantry: ["1 tsp olive oil or cooking spray", "Salt, pepper", "Optional: spinach or herbs"],
            steps: (c) => [
                "Whisk eggs with a pinch of salt and pepper.",
                lowCal
                    ? "Cook in a non-stick pan with minimal oil until just set."
                    : "Scramble in a pan with a little oil; fold in greens if you have them.",
                `Serve as breakfast or snack — aim for ~${Math.round(c.protein * 0.15)}–${Math.round(c.protein * 0.25)}g protein from this meal if it is your main egg serving.`,
            ],
        };
    }
    if (/chicken|turkey/.test(n)) {
        return {
            titlePrefix: "Simple grilled",
            pantry: ["Salt, pepper", "Lemon or vinegar", "Optional: mixed greens"],
            steps: (c) => [
                "Season protein and let sit 10 minutes if you have time.",
                "Grill or pan-sear until cooked through (no pink in the center).",
                `Pair with vegetables and a small starch to hit ~${c.calories} kcal/day across meals.`,
            ],
        };
    }
    if (/fish|salmon|tuna/.test(n)) {
        return {
            titlePrefix: "Quick",
            pantry: ["Lemon", "Garlic or herbs", "Olive oil"],
            steps: () => [
                "Pat dry, season, and bake 12–15 minutes at 200°C or pan-sear skin-side down first.",
                "Finish with lemon; serve with greens or whole grains if available.",
                "Fish is protein-dense — keep added oils modest if you are in a fat-loss phase.",
            ],
        };
    }
    if (/rice|pasta|noodle|quinoa/.test(n)) {
        return {
            titlePrefix: "Balanced bowl with",
            pantry: ["Cooked vegetables", "Protein (eggs, chicken, or beans)", "Light dressing"],
            steps: (c) => [
                "Portion carbs to match your goal: smaller if losing fat, fuller if muscle gain.",
                "Top with protein and vegetables you have in the fridge.",
                `Target roughly ${c.protein}g protein across the full day — add a protein source if this bowl is mostly carbs.`,
            ],
        };
    }
    if (/milk|yogurt|cheese/.test(n)) {
        return {
            titlePrefix: "Snack:",
            pantry: ["Oats or fruit", "Cinnamon", "Optional: honey (small amount)"],
            steps: () => [
                "Combine dairy with fruit or oats for a balanced snack.",
                lowCal ? "Choose plain yogurt and skip added sugar." : "Add calories via fruit, oats, or nut butter if you are underweight.",
                "Keep dairy refrigerated until use.",
            ],
        };
    }
    if (/apple|banana|berry|fruit|orange|grape/.test(n)) {
        return {
            titlePrefix: "Fresh",
            pantry: ["Yogurt or nuts (small handful)", "Cinnamon"],
            steps: () => [
                "Wash and slice fruit; pair with protein (yogurt, eggs, or cheese) for staying power.",
                "Use as snack between main meals.",
                lowCal ? "Prioritize whole fruit over juice for fiber." : "Add nut butter or oats if you need more energy.",
            ],
        };
    }
    if (/spinach|lettuce|kale|broccoli|veg|carrot|pepper|tomato/.test(n)) {
        return {
            titlePrefix: "Veg-forward plate:",
            pantry: ["Olive oil", "Lemon or vinegar", "Protein of choice"],
            steps: (c) => [
                "Sauté or steam vegetables; season simply.",
                "Add a palm-sized serving of protein to round out the meal.",
                `Fiber supports satiety — helpful when aiming for ~${c.calories} kcal/day.`,
            ],
        };
    }

    return {
        titlePrefix: "Simple meal with",
        pantry: ["Salt, pepper", "Olive oil", "Lemon or herbs"],
        steps: (c) => [
            `Build a plate: highlight ${name} as the star ingredient.`,
            "Add color (veg) and protein if you have it — balance to your BMI and goal.",
            `Rough daily target from your plan: ~${c.calories} kcal, ~${c.protein}g protein (split across meals).`,
        ],
    };
}
