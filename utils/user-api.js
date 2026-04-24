import { getAuthHeaders } from "./auth";

const USER_CACHE_TTL_MS = 30_000;
const userCache = new Map();

function getCachedEntry(userId) {
    const entry = userCache.get(userId);

    if (!entry) {
        return null;
    }

    if (Date.now() - entry.timestamp > USER_CACHE_TTL_MS) {
        userCache.delete(userId);
        return null;
    }

    return entry.user;
}

export function storeUserProfile(user) {
    if (!user?._id) {
        return user;
    }

    userCache.set(user._id, {
        user,
        timestamp: Date.now(),
    });

    if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(user));
    }

    return user;
}

export function invalidateUserCache(userId) {
    if (!userId) {
        return;
    }

    userCache.delete(String(userId));
}

export async function fetchUserProfile(userId, { force = false } = {}) {
    if (!userId) {
        throw new Error("userId is required");
    }

    const normalizedUserId = String(userId);

    if (!force) {
        const cachedUser = getCachedEntry(normalizedUserId);
        if (cachedUser) {
            return cachedUser;
        }
    }

    const res = await fetch(`/api/users/me?userId=${encodeURIComponent(normalizedUserId)}`, {
        headers: getAuthHeaders(),
    });
    const data = await res.json();

    if (!res.ok || !data.user) {
        throw new Error(data.error || "Failed to fetch user data");
    }

    return storeUserProfile(data.user);
}
