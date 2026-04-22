export function stripTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "");
}

/**
 * Base URL for the local YOLO FastAPI app (`inference/app.py`), no trailing slash.
 */
export function getLocalModelBaseUrl() {
    return stripTrailingSlash(
        process.env.LOCAL_MODEL_URL || "http://localhost:8000"
    );
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
