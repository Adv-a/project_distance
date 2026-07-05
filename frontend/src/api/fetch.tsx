const BACKEND_URL = "http://localhost:8000";

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;

    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        return parts.pop()?.split(";").shift() ?? null;
    }

    return null;
}

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

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

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (method !== "GET") {
        const csrfToken = getCookie("csrftoken") ?? await getCsrfToken();

        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        }
    }

    const res = await fetch(`${BACKEND_URL}/api/${cleanEndpoint}`, {
        method,
        credentials: "include",
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();

    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        throw new Error(
            typeof data === "object" && data?.detail
                ? data.detail
                : `API error ${res.status}`
        );
    }

    return data;
}