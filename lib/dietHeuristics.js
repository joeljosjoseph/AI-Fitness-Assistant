export function bmi(weightKg, heightCm) {
    const hM = heightCm / 100;
    if (hM <= 0) return 0;
    return Math.round((weightKg / (hM * hM)) * 10) / 10;
}

export function bmiCategory(bmi) {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal";
    if (bmi < 30) return "Overweight";
    return "Obese";
}

export function dietTargets(goal, weightKg) {
    let mult;
    let proteinGPerKg;
    let planCat;

    if (goal === "Lose Weight") {
        mult = 22;
        proteinGPerKg = 1.8;
        planCat = "Moderate deficit, high protein";
    } else if (goal === "Build Muscle") {
        mult = 32;
        proteinGPerKg = 2.0;
        planCat = "Lean bulk, performance fuel";
    } else if (goal === "Improve Endurance") {
        mult = 30;
        proteinGPerKg = 1.6;
        planCat = "Carb-aware endurance support";
    } else {
        mult = 28;
        proteinGPerKg = 1.6;
        planCat = "Balanced maintenance";
    }

    const calories = Math.max(1200, Math.round(weightKg * mult));
    const protein = Math.round(weightKg * proteinGPerKg);

    const meal_plan_details = [
        `Breakfast: Oats with yogurt and berries (~${Math.round(calories * 0.25)} kcal)`,
        `Lunch: Grilled chicken salad with whole grains (~${Math.round(calories * 0.35)} kcal)`,
        `Dinner: Fish or tofu, vegetables, rice (~${Math.round(calories * 0.3)} kcal)`,
        `Snack: Fruit and nuts (~${Math.round(calories * 0.1)} kcal)`,
        `Total: aim near ${calories} kcal with ${protein}g protein (adjust portions to hunger)`,
    ].join(" | ");

    return { calories, protein, meal_plan_category: planCat, meal_plan_details };
}
