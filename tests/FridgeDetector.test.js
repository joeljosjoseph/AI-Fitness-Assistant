import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FridgeDetector from "../components/modules/FridgeDetector";

jest.mock("react-toastify", () => ({
    toast: { info: jest.fn(), success: jest.fn(), error: jest.fn() },
}));

const mockUser = {
    _id: "123",
    login: { fullName: "Test User" },
};

describe("FridgeDetector", () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem("user", JSON.stringify(mockUser));
        process.env.NEXT_PUBLIC_API_URL = "";
        global.fetch = jest.fn((url) => {
            if (url === "/api/fridge/items?userId=123") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        success: true,
                        items: [{ name: "Eggs", count: 2 }],
                    }),
                });
            }
            return Promise.reject(new Error(`Unhandled fetch: ${url}`));
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    test("syncs fetched fridge items to diet planner storage", async () => {
        render(<FridgeDetector darkMode={false} />);

        await screen.findByText(/current fridge items/i);
        await waitFor(() => {
            expect(JSON.parse(localStorage.getItem("fridgeItemsForDiet"))).toEqual([
                { name: "Eggs", count: 2 },
            ]);
        });
    });

    test("uses the local detect route so detections can be persisted", async () => {
        global.fetch = jest.fn((url) => {
            if (url === "/api/fridge/items?userId=123") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, items: [] }),
                });
            }
            if (url === "/api/fridge/detect") {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({
                        items: [{ name: "Milk", count: 1 }],
                    }),
                });
            }
            return Promise.reject(new Error(`Unhandled fetch: ${url}`));
        });

        render(<FridgeDetector darkMode={false} />);
        await screen.findByText(/current fridge items/i);

        const fileInput = document.querySelector('input[type="file"]');
        const file = new File(["image"], "fridge.jpg", { type: "image/jpeg" });
        await userEvent.upload(fileInput, file);
        await userEvent.click(screen.getByRole("button", { name: /detect & save/i }));

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith("/api/fridge/detect", expect.objectContaining({
                method: "POST",
            }));
        });
    });
});
