/**
 * Environment readers shared by server code and proxy.ts, which must not import
 * "server-only" modules. Prefer `serverEnv` everywhere else.
 */
export type AuthMode = "api" | "dev";

export function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function apiBaseUrlFromEnv() {
  return (readEnv("API_BASE_URL") ?? "https://localhost:7071").replace(/\/+$/, "");
}

export function authModeFromEnv(): AuthMode {
  // Dev sign-in is never available in a production build.
  return readEnv("AUTH_MODE") === "dev" && process.env.NODE_ENV !== "production" ? "dev" : "api";
}
