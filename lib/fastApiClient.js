function stripTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
}

export function getFastApiBaseUrl() {
    return stripTrailingSlash(
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.FASTAPI_URL ||
        process.env.ML_API_URL
    );
}

export async function requestFastApi(pathname, options = {}) {
    const baseUrl = getFastApiBaseUrl();
    if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured.");
    }

    const response = await fetch(`${baseUrl}${pathname}`, options);
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const message =
            errorBody.detail ||
            errorBody.error ||
            `FastAPI request failed with status ${response.status}`;
        throw new Error(message);
    }

    return response;
}
