const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ?? "";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function getCookie(name: string): string | null {
    if (typeof document === "undefined") {
        return null;
    }

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() ?? null;
    }

    return null;
}

export async function getCsrfToken(): Promise<string | null> {
    await fetch(`${BACKEND_URL}/api/auth/csrf/`, {
        method: "GET",
        credentials: "include",
    });

    return getCookie("csrftoken");
}

export async function apiFetch(
    endpoint: string,
    method: ApiMethod = "GET",
    body?: unknown
) {
    const cleanEndpoint = endpoint.startsWith("/")
        ? endpoint.slice(1)
        : endpoint;

    const isFormData =
        typeof FormData !== "undefined" && body instanceof FormData;

    const headers: Record<string, string> = {};

    if (!isFormData) {
        headers["Content-Type"] = "application/json";
    }

    if (method !== "GET") {
        const csrfToken = getCookie("csrftoken") ?? await getCsrfToken();

        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        }
    }

    const response = await fetch(`${BACKEND_URL}/api/${cleanEndpoint}`, {
        method,
        credentials: "include",
        headers,
        body: isFormData
            ? body
            : body !== undefined
                ? JSON.stringify(body)
                : undefined,
    });

    const text = await response.text();

    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        throw new Error(
            typeof data === "object" && data?.detail
                ? typeof data.detail === "string"
                    ? data.detail
                    : JSON.stringify(data.detail)
                : `API error ${response.status}`
        );
    }

    return data;
}