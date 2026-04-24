import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Hydration from "../components/modules/Hydration";

jest.mock("react-toastify", () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockUser = {
    _id: "123",
    personalDetails: { age: 25, currentWeight: 70, height: 175 },
    fitnessGoals: { primaryGoal: "Lose Weight" },
    hydration: {
        currentProgress: 750,
        dailyGoal: 2500,
        workoutIntensity: "moderate",
        reminder: false,
    },
};

const setupFetch = () => {
    global.fetch = jest.fn((url) => {
        if (url.includes("/api/users/me")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ user: mockUser }),
            });
        }

        if (url.includes("/api/update-hydration")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ user: mockUser }),
            });
        }

        if (url.includes("/hydration/predict")) {
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        recommended_intake_ml: 3000,
                        recommended_intake_liters: 3.0,
                    }),
            });
        }
    });
};

beforeEach(() => {
    setupFetch();
    localStorage.setItem("user", JSON.stringify(mockUser));
    process.env.MODEL_API_SECRET_KEY = "http://localhost:8000";
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "log").mockImplementation(() => { });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
});

const waitForLoad = () => screen.findByText(/today's progress/i);

test("renders the hydration tracker after loading", async () => {
    render(<Hydration />);
    await waitForLoad();

    expect(screen.getByText(/hydration tracker/i)).toBeInTheDocument();
});

test("shows loading skeleton while fetching user data", () => {
    global.fetch = jest.fn(() => new Promise(() => { }));
    render(<Hydration />);

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
});

test("displays water intake and daily goal from localStorage", async () => {
    render(<Hydration />);
    await waitForLoad();

    expect(document.body.textContent).toContain("750");
    expect(document.body.textContent).toContain("2500");
    expect(document.body.textContent).toContain("1750ml remaining");
});

test("adds water when a quick add button is clicked", async () => {
    render(<Hydration />);
    await waitForLoad();

    await userEvent.click(screen.getByText("250ml"));

    await waitFor(() =>
        expect(document.body.textContent).toContain("1000")
    );
});

test("resets water intake to 0 when Reset is clicked", async () => {
    render(<Hydration />);
    await waitForLoad();

    await userEvent.click(screen.getByRole("button", { name: /reset/i }));

    await waitFor(() =>
        expect(document.body.textContent).toContain("2500ml remaining")
    );
});

test("shows validation toast when predicting with missing fields", async () => {
    const { toast } = require("react-toastify");
    localStorage.clear();

    render(<Hydration />);
    await waitForLoad();

    await userEvent.click(
        screen.getByRole("button", { name: /calculate optimal hydration/i })
    );

    expect(toast.info).toHaveBeenCalledWith(
        expect.stringContaining("Fill in:")
    );
});

test("displays the AI hydration tip", async () => {
    render(<Hydration />);
    await waitForLoad();

    expect(screen.getByText(/ai hydration tip/i)).toBeInTheDocument();
});
