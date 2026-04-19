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