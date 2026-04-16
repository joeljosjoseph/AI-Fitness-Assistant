import { bmi, bmiCategory, dietTargets } from "@/lib/dietHeuristics";
import { requestFastApi } from "@/lib/fastApiClient";
import { lookupGymRow } from "@/lib/gymCsvIndex";
import { buildFridgeRecipes } from "@/lib/recipesFromFridge";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ detail: "Only POST allowed" });
    }

    const body = req.body || {};
    const { gender, goal, weight_kg, height_cm, fridgeItems } = body;

    if (!gender || !goal || weight_kg == null || height_cm == null) {
        return res.status(400).json({ detail: "gender, goal, weight_kg, and height_cm are required" });
    }

    const w = Number(weight_kg);
    const h = Number(height_cm);
    if (!(w > 0) || !(h > 0)) {
        return res.status(400).json({ detail: "weight_kg and height_cm must be positive numbers" });
    }

    const b = bmi(w, h);
    const cat = bmiCategory(b);
    const targets = dietTargets(goal, w);

    let ml = null;
    try {
        const response = await requestFastApi("/gym-plan/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                gender,
                goal,
                weight_kg: w,
                height_cm: h,
            }),
        });
        const data = await response.json();
        if (data?.gym) {
            ml = data.gym;
        } else if (data?.exercise_schedule || data?.meal_plan_focus) {
            ml = data;
        }
    } catch {
        ml = null;
    }

    let gym = null;
    let gym_source = "csv_lookup";

    if (ml) {
        gym_source = "fastapi_ml";
        gym = {
            exercise_schedule: ml.exercise_schedule,
            meal_plan_focus: ml.meal_plan_focus,
            csv_goal: ml.csv_goal,
            csv_bmi_category: ml.csv_bmi_category,
        };
    } else {
        const row = lookupGymRow({ gender, uiGoal: goal, bmiCategory: cat });
        if (row) {
            gym = {
                exercise_schedule: row.exerciseSchedule,
                meal_plan_focus: row.mealPlan,
                csv_goal: row.goal,
                csv_bmi_category: row.bmiCategory,
            };
        }
    }

    const recipes = buildFridgeRecipes(fridgeItems, gym?.meal_plan_focus || null, {
        bmi_category: cat,
        goal,
        calories: targets.calories,
        protein: targets.protein,
    });

    return res.status(200).json({
        gender,
        goal,
        bmi: b,
        bmi_category: cat,
        meal_plan_category: targets.meal_plan_category,
        calories: targets.calories,
        protein: targets.protein,
        meal_plan_details: targets.meal_plan_details,
        gym,
        gym_source,
        recipes,
    });
}
