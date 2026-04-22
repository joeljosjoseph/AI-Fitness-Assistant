import { useEffect } from "react";

export function logout(router) {
    localStorage.removeItem("user");
    router.push("/");
}

export function useRequireAuth(router) {
    useEffect(() => {
        const user = localStorage.getItem("user");
        if (!user) {
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