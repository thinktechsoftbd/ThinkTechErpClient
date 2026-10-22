import "server-only";
import { jwtSettingsFromEnv } from "@/core/auth/token";
import { apiBaseUrlFromEnv, authModeFromEnv, readEnv as read, type AuthMode } from "./env";

export type { AuthMode };

/**
 * Server-only configuration. Values are read lazily so a missing optional
 * setting only fails the feature that needs it, not the whole app.
 */
export const serverEnv = {
  get apiBaseUrl() {
    return apiBaseUrlFromEnv();
  },
  get authMode(): AuthMode {
    return authModeFromEnv();
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
  /** Values pre-filled on the sign-in form for local development; never in a production build. */
  get loginDefaults() {
    if (process.env.NODE_ENV === "production") return {};
    return { email: read("LOGIN_DEFAULT_EMAIL"), password: read("LOGIN_DEFAULT_PASSWORD") };
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
