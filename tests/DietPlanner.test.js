import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DietPlanner from "../components/modules/DietPlanner";

// ─── Mock Setup ───────────────────────────────────────────────────────────────

jest.mock("react-toastify", () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockUser = {
    _id: "123",
    personalDetails: {
        gender: "Male",
        fitnessGoal: "Weight Loss",
        currentWeight: 70,
        height: 170,
    },
};

const mockDietResult = {
    gender: "Male",
    goal: "Lose Weight",
    bmi: 24.2,
    bmi_category: "Normal",
    meal_plan_category: "Low Calorie",
    calories: 1800,
    protein: 140,
    meal_plan_details:
        "Breakfast: Eggs | Lunch: Chicken salad | Dinner: Salmon | Snack: Apple | Total: 1800 cal, 140g protein",
};

const mockDietResultWithRecipes = {
    ...mockDietResult,
    recipes: [
        {
            title: "Simple meal with Eggs",
            usesFridge: ["Eggs"],
            ingredients: ["Eggs (you have x2)", "Salt", "Pepper"],
            steps: ["Cook the eggs.", "Pair with vegetables.", "Serve warm."],
            note: "Uses what you have on hand; adjust portions to your calorie target.",
        },
    ],
};

global.fetch = jest.fn((url) => {
    if (url.includes("/api/users/me"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, user: mockUser }) });
    if (url.includes("/api/fridge/items"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, items: [] }) });
    if (url.includes("/diet/info"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ genders: ["Male", "Female"], goals: ["Lose Weight", "Build Muscle"] }) });
    if (url.includes("/diet/predict"))
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDietResult) });
});

beforeEach(() => {
    localStorage.setItem("user", JSON.stringify(mockUser));
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
});

afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
});

// ─── Helper ───────────────────────────────────────────────────────────────────
const getGenderSelect = () => screen.getByLabelText(/gender/i);
const getGoalSelect = () => screen.getByLabelText(/fitness goal/i);

const fillAndSubmit = async () => {
    await userEvent.selectOptions(getGenderSelect(), "Male");
    await userEvent.selectOptions(getGoalSelect(), "Lose Weight");
    await userEvent.click(screen.getByRole("button", { name: /generate diet plan/i }));
};

// ─── Tests ────────────────────────────────────────────────────────────────────

test("renders the page after loading", async () => {
    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);
    expect(screen.getByText(/diet planner/i)).toBeInTheDocument();
});

test("pre-fills weight and height fields from localStorage", async () => {
    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);

    expect(screen.getByLabelText(/weight \(kg\)/i)).toHaveValue(70);
    expect(screen.getByLabelText(/height \(cm\)/i)).toHaveValue(170);
});

test("shows validation message when submitting empty form", async () => {
    localStorage.clear();
    const { toast } = require("react-toastify");

    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);

    await userEvent.click(screen.getByRole("button", { name: /generate diet plan/i }));

    expect(toast.info).toHaveBeenCalledWith("Please fill in all fields");
});

test("shows results after submitting the form", async () => {
    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);

    await fillAndSubmit();

    await screen.findByText(/your health metrics/i);
    expect(screen.getByText("24.2")).toBeInTheDocument();
    expect(screen.getByText(/low calorie/i)).toBeInTheDocument();
    expect(screen.getByText(/breakfast:/i)).toBeInTheDocument();
});

test("hides results after clicking Reset", async () => {
    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);

    await fillAndSubmit();
    await screen.findByText(/your health metrics/i);

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));

    await waitFor(() =>
        expect(screen.queryByText(/your health metrics/i)).not.toBeInTheDocument()
    );
});

test("does not show results when API returns an error", async () => {
    fetch.mockImplementation((url) => {
        if (url.includes("/diet/predict"))
            return Promise.resolve({ ok: false, json: () => Promise.resolve({ detail: "Server error" }) });
        if (url.includes("/api/users/me"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, user: mockUser }) });
        if (url.includes("/api/fridge/items"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, items: [] }) });
        if (url.includes("/diet/info"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ genders: ["Male", "Female"], goals: ["Lose Weight", "Build Muscle"] }) });
    });

    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);

    await fillAndSubmit();

    await waitFor(() =>
        expect(screen.queryByText(/your health metrics/i)).not.toBeInTheDocument()
    );
});

test("falls back to local diet API and shows fridge-based recipes", async () => {
    localStorage.setItem("fridgeItemsForDiet", JSON.stringify([{ name: "Eggs", count: 2 }]));
    process.env.NEXT_PUBLIC_API_URL = "";

    fetch.mockImplementation((url) => {
        if (url.includes("/api/users/me"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, user: mockUser }) });
        if (url.includes("/api/fridge/items"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, items: [] }) });
        if (url.includes("/diet/info"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ genders: ["Male", "Female"], goals: ["Lose Weight", "Build Muscle"] }) });
        if (url === "/api/diet/predict")
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDietResultWithRecipes) });
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);

    await fillAndSubmit();

    await screen.findByText(/recipe book/i);
    expect(screen.getByText(/simple meal with eggs/i)).toBeInTheDocument();
    expect(screen.getByText(/uses: eggs/i)).toBeInTheDocument();
});

test("loads fridge items even if profile fetch fails", async () => {
    fetch.mockImplementation((url) => {
        if (url.includes("/api/users/me"))
            return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Authentication token is required" }) });
        if (url.includes("/api/fridge/items"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, items: [{ name: "Eggs", count: 2 }] }) });
        if (url.includes("/diet/info"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ genders: ["Male", "Female"], goals: ["Lose Weight", "Build Muscle"] }) });
        if (url === "/api/diet/predict")
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDietResultWithRecipes) });
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    process.env.NEXT_PUBLIC_API_URL = "";

    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);
    await screen.findByText(/fridge items connected \(1\)/i);

    await fillAndSubmit();

    await screen.findByText(/recipe book/i);
    expect(screen.getByText(/simple meal with eggs/i)).toBeInTheDocument();
});

test("uses the local diet API even when NEXT_PUBLIC_API_URL is set so recipes still render", async () => {
    localStorage.setItem("fridgeItemsForDiet", JSON.stringify([{ name: "Eggs", count: 2 }]));
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";

    fetch.mockImplementation((url) => {
        if (url.includes("/api/users/me"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, user: mockUser }) });
        if (url.includes("/api/fridge/items"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true, items: [] }) });
        if (url.includes("/diet/info"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ genders: ["Male", "Female"], goals: ["Lose Weight", "Build Muscle"] }) });
        if (url === "/api/diet/predict")
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDietResultWithRecipes) });
        if (String(url).includes("http://localhost:8000/diet/predict"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve(mockDietResult) });
        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });

    render(<DietPlanner />);
    await screen.findByText(/diet planner/i);

    await fillAndSubmit();

    await screen.findByText(/recipe book/i);
    expect(screen.getByText(/simple meal with eggs/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/diet/predict", expect.any(Object));
});
