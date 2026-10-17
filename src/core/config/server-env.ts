import "server-only";
import { jwtSettingsFromEnv } from "@/core/auth/token";

export type AuthMode = "api" | "dev";

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/**
 * Server-only configuration. Values are read lazily so a missing optional
 * setting only fails the feature that needs it, not the whole app.
 */
export const serverEnv = {
  get apiBaseUrl() {
    return trimTrailingSlash(read("API_BASE_URL") ?? "http://localhost:5291");
  },
  get authMode(): AuthMode {
    const mode = read("AUTH_MODE");
    // Dev sign-in is never available in a production build.
    if (mode === "dev" && process.env.NODE_ENV !== "production") return "dev";
    return "api";
  },
  get authLoginPath() {
    return read("AUTH_LOGIN_PATH") ?? "/api/security/auth/login";
  },
  get authLogoutPath() {
    return read("AUTH_LOGOUT_PATH") ?? "/api/security/auth/logout";
  },
  get jwt() {
    return jwtSettingsFromEnv();
  },
  get devUser() {
    return {
      userName: read("DEV_AUTH_USERNAME") ?? "admin",
      password: read("DEV_AUTH_PASSWORD"),
      roles: (read("DEV_AUTH_ROLES") ?? "admin,sms_admin")
        .split(",")
        .map((role) => role.trim())
        .filter(Boolean),
    };
  },
  get timeZone() {
    return read("APP_TIME_ZONE");
  },
};
