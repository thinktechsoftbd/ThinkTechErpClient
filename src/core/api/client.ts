import "server-only";
import { redirect } from "next/navigation";
import { getAccessToken } from "@/core/auth/session";
import { appConfig } from "@/core/config/app";
import { serverEnv } from "@/core/config/server-env";
import { ApiError, readApiError, type ApiErrorInfo } from "./errors";

type QueryValue = string | number | boolean | null | undefined;

export type ApiRequest = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Attach the session's bearer token (default true). */
  auth?: boolean;
};

const expiredPath = `${appConfig.loginPath}?expired=1`;

/**
 * Server-side fetch to ThinkTechErpAPI. The bearer token is read from the
 * httpOnly session cookie, so it never reaches the browser.
 */
export async function apiFetch<T>(path: string, request: ApiRequest = {}): Promise<T> {
  const { method = "GET", query, body, auth = true } = request;

  const url = new URL(path.replace(/^\/+/, ""), `${serverEnv.apiBaseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (auth) {
    const token = await getAccessToken();
    if (!token) redirect(expiredPath);
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      // A redirect (e.g. http -> https) would drop the Authorization header; surface it instead.
      redirect: "manual",
    });
  } catch {
    throw new ApiError({
      status: 0,
      message: `Cannot reach the API at ${serverEnv.apiBaseUrl}. Check that ThinkTechErpAPI is running and API_BASE_URL is correct.`,
      path,
    });
  }

  if (response.status >= 300 && response.status < 400) {
    throw new ApiError({
      status: response.status,
      message: `The API redirected to ${response.headers.get("location") ?? "another address"}. Set API_BASE_URL to the final address.`,
      path,
    });
  }
  if (response.status === 401 && auth) redirect(expiredPath);
  if (!response.ok) throw await readApiError(response, path);
  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorInfo };

/** Runs an API call for rendering, turning ApiError into a value. Redirects still propagate. */
export async function tryApi<T>(call: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await call() };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.toInfo() };
    throw error;
  }
}
