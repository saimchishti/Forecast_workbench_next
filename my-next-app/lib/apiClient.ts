const normalizeBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  return raw.replace(/\/+$/, "");
};

const API_BASE_URL = normalizeBaseUrl();

const buildUrl = (endpoint: string) => {
  const normalized = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalized}`;
};

const shouldAttachJsonHeader = (options?: RequestInit) => {
  if (!options?.body) return true;
  if (typeof FormData !== "undefined" && options.body instanceof FormData) {
    return false;
  }
  return true;
};

const buildHeaders = (options?: RequestInit) => {
  const headers = new Headers(options?.headers || {});
  if (shouldAttachJsonHeader(options) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
};

export type ApiError = { error: string };

export const isApiError = <T>(payload: T | ApiError): payload is ApiError =>
  typeof payload === "object" && payload !== null && "error" in payload;

export async function fetchFromAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(endpoint), {
    ...options,
    headers: buildHeaders(options),
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      detail =
        payload?.detail ??
        payload?.message ??
        payload?.error ??
        (typeof payload === "string" ? payload : detail);
    } catch {
      // ignore JSON parse issues
    }
    throw new Error(`API error (${response.status}): ${detail}`);
  }

  return (await response.json()) as T;
}

export async function safeFetch<T>(endpoint: string, options?: RequestInit): Promise<T | ApiError> {
  try {
    return await fetchFromAPI<T>(endpoint, options);
  } catch (error) {
    console.error("Backend temporarily unavailable:", error);
    return { error: "Backend waking up... please wait a few seconds and retry." };
  }
}

export const apiBaseUrl = API_BASE_URL;
