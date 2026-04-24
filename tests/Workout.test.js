import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Workout from "../components/modules/Workout";

const mockStoredUser = {
    _id: "user-123",
    login: { fullName: "John Doe", email: "john@example.com" },
};

const mockWorkoutPlan = {
    planName: "Strength Builder",
    summary: "Progressive upper/lower split",
    structure: "4-day split",
    fullPlan: [
        "### Day 1: Upper Body Strength",
        "- **Warm-up**: 5 minutes rowing",
        "- **Bench Press**: 4 sets of 8 reps, 90 seconds rest",
        "- **Dumbbell Rows**: 3 sets of 10 reps, 60 seconds rest",
        "- **Plank Hold**: 3 sets of 45 reps, 30 seconds rest",
        "- **Cool-down**: Stretch chest and lats",
        "### Day 2: Lower Body & Core",
        "- **Warm-up**: 5 minutes cycling",
        "- **Romanian Deadlifts**: 4 sets of 8 reps, 90 seconds rest",
        "- **Walking Lunges**: 3 sets of 12 reps, 60 seconds rest",
        "- **Hanging Knee Raises**: 3 sets of 12 reps, 45 seconds rest",
        "### Day 3: Cardio & Mobility",
        "- **Jump Rope**: 5 sets of 60 reps, 30 seconds rest",
        "- **Mountain Climbers**: 3 sets of 20 reps, 30 seconds rest",
        "- **Mobility Flow**: 2 sets of 10 reps, 20 seconds rest",
        "### Day 4: Full Body Circuit",
        "- **Kettlebell Swings**: 4 sets of 12 reps, 45 seconds rest",
        "- **Push Press**: 3 sets of 10 reps, 60 seconds rest",
        "- **Goblet Squats**: 3 sets of 12 reps, 45 seconds rest",
    ].join("\n"),
};

const mockFetchedUser = {
    ...mockStoredUser,
    workoutPlan: mockWorkoutPlan,
};

beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
    localStorage.setItem("user", JSON.stringify(mockStoredUser));

    global.fetch = jest.fn((url, options = {}) => {
        if (url.includes("/api/users/me?userId=user-123")) {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ user: mockFetchedUser }),
            });
        }

        if (url === "/api/users/me" && options.method === "PUT") {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, user: mockFetchedUser }),
            });
        }

        return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
});

const renderWorkout = async () => {
    render(<Workout />);
    await screen.findByText(/strength builder/i);
};

const waitForTodayExercises = async () => {
    await waitFor(() =>
        expect(document.body.textContent).toContain("Bench Press")
    );
};

test("renders active workout plan and today's tab by default", async () => {
    await renderWorkout();

    expect(screen.getByText(/upper body strength/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upcoming/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /full plan/i })).toBeInTheDocument();
});

test("renders today's exercises", async () => {
    await renderWorkout();
    await waitForTodayExercises();

    expect(document.body.textContent).toContain("Bench Press");
    expect(document.body.textContent).toContain("Dumbbell Rows");
    expect(document.body.textContent).toContain("Plank Hold");
});

test("shows initial progress summary for today's workout", async () => {
    await renderWorkout();
    await waitForTodayExercises();

    expect(document.body.textContent.replace(/\s+/g, "")).toContain("0/3");
});

test("switches to upcoming tab and shows future workout days", async () => {
    await renderWorkout();

    await userEvent.click(screen.getByRole("button", { name: /upcoming/i }));

    expect(screen.getByText(/lower body & core/i)).toBeInTheDocument();
    expect(screen.getByText(/cardio & mobility/i)).toBeInTheDocument();
    expect(screen.getByText(/full body circuit/i)).toBeInTheDocument();
});

test("expands workout details when an upcoming day is clicked", async () => {
    await renderWorkout();

    await userEvent.click(screen.getByRole("button", { name: /upcoming/i }));
    await userEvent.click(screen.getByRole("button", { name: /lower body & core/i }));

    expect(screen.getByText(/romanian deadlifts/i)).toBeInTheDocument();
});

test("switches to full plan tab and shows all workout days", async () => {
    await renderWorkout();

    await userEvent.click(screen.getByRole("button", { name: /full plan/i }));

    expect(screen.getByText(/upper body strength/i)).toBeInTheDocument();
    expect(screen.getByText(/lower body & core/i)).toBeInTheDocument();
    expect(screen.getByText(/full body circuit/i)).toBeInTheDocument();
});

test("shows not logged in message when no user is stored", async () => {
    localStorage.clear();
    render(<Workout />);

    await waitFor(() =>
        expect(screen.getByText(/not logged in/i)).toBeInTheDocument()
    );
});
