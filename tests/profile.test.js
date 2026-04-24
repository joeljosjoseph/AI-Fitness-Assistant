import { render, screen } from "@testing-library/react";
import UserProfile from "../pages/profile";

jest.mock("next/router", () => ({
    useRouter: () => ({
        push: jest.fn(),
        prefetch: jest.fn(),
        pathname: "/profile",
        query: {},
        asPath: "/profile",
    }),
}));

const mockUser = {
    _id: "123",
    login: { fullName: "Jane Doe", email: "jane@example.com" },
    personalDetails: {
        age: 28,
        gender: "Female",
        height: 65,
        currentWeight: 140,
        targetWeight: 130,
    },
    fitnessGoals: {
        primaryGoal: "Lose weight",
        fitnessLevel: "Intermediate",
        availableEquipment: ["Full gym"],
        injuries: [],
    },
    schedule: {
        workoutDaysPerWeek: 4,
        timePerWorkout: 45,
    },
    progress: {
        workoutsCompleted: 12,
        caloriesBurned: 2400,
    },
    createdAt: "2024-01-15T00:00:00.000Z",
};

beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "log").mockImplementation(() => { });

    localStorage.setItem("user", JSON.stringify({ _id: "123" }));

    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, user: mockUser }),
        })
    );
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
});

const waitForLoad = () => screen.findByRole("heading", { name: "Jane Doe" });

test("shows loading spinner while fetching profile", async () => {
    global.fetch = jest.fn(() => new Promise(() => { }));
    render(<UserProfile />);

    expect(await screen.findByText(/loading profile/i)).toBeInTheDocument();
});

test("renders user name and profile after loading", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getAllByText("Jane Doe").length).toBeGreaterThan(0);
});

test("renders fitness level and days per week badges", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getAllByText("Intermediate").length).toBeGreaterThan(0);
    expect(screen.getByText(/4 days\/week/i)).toBeInTheDocument();
});

test("renders quick stats from user data", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getByText("140")).toBeInTheDocument();
    expect(screen.getByText("130")).toBeInTheDocument();
    expect(screen.getByText("28")).toBeInTheDocument();
});

test("shows edit in settings button initially", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getByRole("button", { name: /edit in settings/i })).toBeInTheDocument();
});

test("renders progress summary cards", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getByText(/workouts completed/i)).toBeInTheDocument();
    expect(screen.getByText(/calories burned/i)).toBeInTheDocument();
    expect(screen.getByText("2,400")).toBeInTheDocument();
});

test("shows error message when profile fails to load", async () => {
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: "Not found" }),
        })
    );

    render(<UserProfile />);

    expect(await screen.findByText(/error loading profile/i)).toBeInTheDocument();
});

test("calculates and displays weekly commitment minutes", async () => {
    render(<UserProfile />);
    await waitForLoad();

    expect(screen.getByText("180")).toBeInTheDocument();
});
