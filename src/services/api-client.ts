import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types";

/** Shared axios instance. Point NEXT_PUBLIC_API_URL at a real backend to swap out the mock API. */
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

const AUTH_PAGES = ["/login", "/forgot-password", "/reset-password"];

interface ErrorBody {
  message?: string;
  errors?: Record<string, string>;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorBody>) => {
    // Session expired or was revoked: send the user back to sign in.
    const onAuthPage = typeof window !== "undefined" && AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));
    if (error.response?.status === 401 && typeof window !== "undefined" && !onAuthPage) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      // Hard navigation drops stale client state belonging to the old session.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/login?next=${next}`);
    }
    const normalized: ApiError = {
      message:
        error.response?.data?.message ??
        (error.code === "ECONNABORTED" ? "The request timed out" : error.message),
      status: error.response?.status,
      errors: error.response?.data?.errors,
    };
    return Promise.reject(normalized);
  },
);

/** Unwraps the `{ data }` envelope every route handler responds with. */
export async function unwrap<T>(request: Promise<{ data: { data: T } }>): Promise<T> {
  const response = await request;
  return response.data.data;
}

export function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as ApiError).message);
  }
  return "Something went wrong";
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (error && typeof error === "object" && "errors" in error) {
    return ((error as ApiError).errors ?? {}) as Record<string, string>;
  }
  return {};
}
