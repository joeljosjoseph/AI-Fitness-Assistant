import { useEffect } from "react";

export function getAuthToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

export function getAuthHeaders(extraHeaders = {}) {
    const token = getAuthToken();

    return token
        ? { ...extraHeaders, Authorization: `Bearer ${token}` }
        : { ...extraHeaders };
}

export function logout(router) {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("fridgeItemsForDiet")
    router.push("/");
}

export function useRequireAuth(router) {
    useEffect(() => {
        const user = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (!user || !token) {
            router.push("/");
        }
    }, [router]);
}

export function validatePassword(password) {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasMinLength = password.length >= 8;

    if (!hasMinLength) return "Password must be at least 8 characters.";
    if (!hasUpperCase) return "Password must contain at least one capital letter.";
    if (!hasNumber) return "Password must contain at least one number.";

    return null; // null means valid
}

export function validateEmail(email) {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!valid) return "Please enter a valid email address.";
    return null;
}
