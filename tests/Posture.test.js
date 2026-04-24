import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PostureCam from "../components/modules/Posture";

// ─── Mock Setup ───────────────────────────────────────────────────────────────

jest.mock("react-toastify", () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockStream = {
    getTracks: jest.fn(() => [{ stop: jest.fn() }]),
};

beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        drawImage: jest.fn(),
    }));
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
        callback(new Blob(["frame"], { type: "image/jpeg" }));
    });

    Object.defineProperty(HTMLMediaElement.prototype, "videoWidth", {
        configurable: true,
        get: () => 640,
    });
    Object.defineProperty(HTMLMediaElement.prototype, "videoHeight", {
        configurable: true,
        get: () => 480,
    });
});

beforeEach(() => {
    process.env.MODEL_API_SECRET_KEY = "http://localhost:8000";
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.useFakeTimers();

    global.fetch = jest.fn((url) => {
        if (url.includes("/create_session"))
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ session_id: "abc123" }),
            });
        if (url.includes("/analyze"))
            return Promise.resolve({
                ok: true,
                json: () =>
                    Promise.resolve({
                        reps: 5,
                        calories: 12,
                        angle: 90,
                        message: "Good form!",
                        fps: 10,
                        detected_label: "Push Up",
                        pose_overlay: {
                            pixel_points: {
                                "11": { x: 269, y: 148 },
                                "12": { x: 365, y: 148 },
                                neck: { x: 317, y: 148 },
                            },
                            connections: [
                                { from: "11", to: "12" },
                                { from: "neck", to: "11" },
                            ],
                            frame_size: { width: 640, height: 480 },
                        },
                    }),
            });
        if (url.includes("/reset_session"))
            return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    Object.defineProperty(global.navigator, "mediaDevices", {
        writable: true,
        value: {
            getUserMedia: jest.fn(() => Promise.resolve(mockStream)),
        },
    });
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
});

const setup = () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<PostureCam />);
    return { user };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

test("renders the page heading", () => {
    setup();

    expect(screen.getByText(/postureai tracker/i)).toBeInTheDocument();
});

test("shows camera placeholder before tracking starts", () => {
    setup();

    expect(screen.getByText(/click start to begin tracking/i)).toBeInTheDocument();
});

// test("renders workout type, detection mode and target reps controls", () => {
//     render(<PostureCam />);

//     expect(screen.getByLabelText(/workout type/i)).toBeInTheDocument();
//     expect(screen.getByLabelText(/detection mode/i)).toBeInTheDocument();
//     expect(screen.getByLabelText(/target reps/i)).toBeInTheDocument();
// });

test("shows Start Tracking button initially", () => {
    setup();

    expect(screen.getByRole("button", { name: /start tracking/i })).toBeInTheDocument();
});

test("workout dropdown contains all workout options", () => {
    setup();

    const workoutSelect = screen.getAllByRole("combobox")[0];
    const options = Array.from(workoutSelect.querySelectorAll("option")).map((o) => o.value);

    expect(options).toContain("Push Up");
    expect(options).toContain("Squat");
    expect(options).toContain("Plank");
    expect(options).toContain("Jumping Jack");
});

test("shows Stop Tracking and Reset buttons after starting", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /start tracking/i }));

    await waitFor(() =>
        expect(screen.getByRole("button", { name: /stop tracking/i })).toBeInTheDocument()
    );
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
});

test("calls createSession with correct method on start", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /start tracking/i }));

    await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining("/create_session"),
            expect.objectContaining({ method: "POST" })
        )
    );
});

// test("shows camera error message when getUserMedia fails", async () => {
//     navigator.mediaDevices.getUserMedia = jest.fn(() =>
//         Promise.reject(new Error("Permission denied"))
//     );

//     render(<PostureCam />);
//     await userEvent.click(screen.getByRole("button", { name: /start tracking/i }));

//     await waitFor(() => {
//         const el = document.querySelector(".text-red-700");
//         expect(el).not.toBeNull();
//         expect(el.textContent).toMatch(/failed to access camera/i);
//     });
// });

test("returns to Start Tracking button after stopping", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /start tracking/i }));
    await waitFor(() =>
        expect(screen.getByRole("button", { name: /stop tracking/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: /stop tracking/i }));

    await waitFor(() =>
        expect(screen.getByRole("button", { name: /start tracking/i })).toBeInTheDocument()
    );
});

test("controls are disabled while tracking is active", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /start tracking/i }));
    await waitFor(() =>
        expect(screen.getByRole("button", { name: /stop tracking/i })).toBeInTheDocument()
    );

    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toBeDisabled(); // Workout Type
    expect(selects[1]).toBeDisabled(); // Detection Mode
    expect(screen.getByRole("spinbutton")).toBeDisabled(); // Target Reps
});

test("renders pose overlay from analyze response", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: /start tracking/i }));

    await waitFor(() =>
        expect(screen.getByRole("button", { name: /stop tracking/i })).toBeInTheDocument()
    );

    await act(async () => {
        jest.advanceTimersByTime(250);
    });

    await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining("/analyze"),
            expect.objectContaining({ method: "POST" })
        )
    );

    expect(screen.getByRole("img", { name: /pose overlay/i })).toBeInTheDocument();
});
