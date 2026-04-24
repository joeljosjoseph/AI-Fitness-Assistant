import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthPage from "../pages/index";

jest.mock("react-toastify", () => ({
    toast: { error: jest.fn(), success: jest.fn() },
    ToastContainer: () => null,
    Bounce: {},
}));

const mockPush = jest.fn();
jest.mock("next/router", () => ({
    useRouter: () => ({ push: mockPush }),
}));

const mockUser = {
    id: "123",
    login: { fullName: "John Doe", email: "john@example.com" },
    personalDetails: { age: 29 },
};

beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => { });
    jest.spyOn(console, "log").mockImplementation(() => { });

    global.fetch = jest.fn((url) => {
        if (url.includes("/api/users/login")) {
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve(JSON.stringify({ user: mockUser })),
            });
        }

        if (url.includes("/api/users/me")) {
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve(JSON.stringify({ success: true, user: mockUser })),
            });
        }

        if (url.includes("/api/users/signup")) {
            return Promise.resolve({
                ok: true,
                text: () => Promise.resolve(JSON.stringify({ user: mockUser })),
            });
        }
    });
});

afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
});

const getSubmitButton = (label) =>
    screen.getAllByRole("button", { name: new RegExp(label, "i") }).find(
        (button) => button.getAttribute("type") === "submit"
    );

const getToggleButton = (label) =>
    screen.getAllByRole("button", { name: new RegExp(label, "i") }).find(
        (button) => button.getAttribute("type") === "button"
    );

test("renders the login form by default", () => {
    render(<AuthPage />);

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(getSubmitButton("sign in")).toBeInTheDocument();
});

test("does not show name or confirm password fields on login", () => {
    render(<AuthPage />);

    expect(screen.queryByLabelText(/full name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
});

test("switches to signup form when Sign up link is clicked", async () => {
    render(<AuthPage />);

    await userEvent.click(getToggleButton("sign up"));

    expect(screen.getByRole("heading", { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
});

test("switches back to login form when Sign in link is clicked", async () => {
    render(<AuthPage />);

    await userEvent.click(getToggleButton("sign up"));
    await userEvent.click(getToggleButton("sign in"));

    expect(screen.getByRole("heading", { name: /welcome back/i })).toBeInTheDocument();
});

test("calls login API with email and password on submit", async () => {
    render(<AuthPage />);

    await userEvent.type(screen.getByLabelText(/email address/i), "john@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.click(getSubmitButton("sign in"));

    await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith("/api/users/login", expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ email: "john@example.com", password: "password123" }),
        }))
    );
});

test("redirects to dashboard after successful login", async () => {
    render(<AuthPage />);

    await userEvent.type(screen.getByLabelText(/email address/i), "john@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "password123");
    await userEvent.click(getSubmitButton("sign in"));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"), { timeout: 2000 });
});

test("shows error toast when login fails", async () => {
    const { toast } = require("react-toastify");
    global.fetch = jest.fn(() =>
        Promise.resolve({
            ok: false,
            text: () => Promise.resolve(JSON.stringify({ error: "Invalid credentials" })),
        })
    );

    render(<AuthPage />);

    await userEvent.type(screen.getByLabelText(/email address/i), "wrong@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "wrongpass");
    await userEvent.click(getSubmitButton("sign in"));

    await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Invalid credentials", expect.anything())
    );
});

test("shows error toast when passwords do not match on signup", async () => {
    const { toast } = require("react-toastify");
    render(<AuthPage />);

    await userEvent.click(getToggleButton("sign up"));
    await userEvent.type(screen.getByLabelText(/full name/i), "John Doe");
    await userEvent.type(screen.getByLabelText(/email address/i), "john@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "Password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "Different123");
    await userEvent.click(getSubmitButton("sign up"));

    await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Passwords do not match.")
    );
});

test("calls signup API with correct data on signup submit", async () => {
    render(<AuthPage />);

    await userEvent.click(getToggleButton("sign up"));
    await userEvent.type(screen.getByLabelText(/full name/i), "John Doe");
    await userEvent.type(screen.getByLabelText(/email address/i), "john@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "Password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "Password123");
    await userEvent.click(getSubmitButton("sign up"));

    await waitFor(() =>
        expect(fetch).toHaveBeenCalledWith("/api/users/signup", expect.objectContaining({
            method: "POST",
        }))
    );
});

test("redirects to dashboard after successful signup", async () => {
    render(<AuthPage />);

    await userEvent.click(getToggleButton("sign up"));
    await userEvent.type(screen.getByLabelText(/full name/i), "John Doe");
    await userEvent.type(screen.getByLabelText(/email address/i), "john@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "Password123");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "Password123");
    await userEvent.click(getSubmitButton("sign up"));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"), { timeout: 2000 });
});
