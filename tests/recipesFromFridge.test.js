import { buildFridgeMealPlanDetails } from "../lib/recipesFromFridge";

describe("buildFridgeMealPlanDetails", () => {
    test("builds meal plan details from saved fridge items", () => {
        const mealPlan = buildFridgeMealPlanDetails(
            [
                { name: "eggs", count: 2 },
                { name: "rice", count: 1 },
                { name: "chicken breast", count: 1 },
                { name: "broccoli", count: 1 },
                { name: "apple", count: 1 },
            ],
            { calories: 1800, protein: 140 }
        );

        expect(mealPlan).toMatch(/Breakfast: Eggs/i);
        expect(mealPlan).toMatch(/Lunch: Chicken Breast with Broccoli with Rice/i);
        expect(mealPlan).toMatch(/Dinner:/i);
        expect(mealPlan).toMatch(/Snack: Apple/i);
        expect(mealPlan).toMatch(/1800 kcal/i);
        expect(mealPlan).toMatch(/140g protein/i);
    });
});
