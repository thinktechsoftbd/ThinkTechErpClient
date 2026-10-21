import { decodeJwt, jwtVerify, type JWTPayload } from "jose";
import { authModeFromEnv, readEnv } from "@/core/config/env";

/** Session cookie holding the API access token (httpOnly, never readable by browser JS). */
export const SESSION_COOKIE = "tt_session";
/** httpOnly cookie holding the API refresh token; proxy.ts uses it to renew the session. */
export const REFRESH_COOKIE = "tt_refresh";

export type JwtSettings = {
  issuer?: string;
  audience?: string;
  signingKey?: string;
};

/** Reads JWT settings straight from the environment (usable from proxy.ts). */
export function jwtSettingsFromEnv(): JwtSettings {
  return {
    issuer: readEnv("AUTH_JWT_ISSUER"),
    audience: readEnv("AUTH_JWT_AUDIENCE"),
    signingKey: readEnv("AUTH_JWT_SIGNING_KEY"),
  };
}

/**
 * How session tokens are checked. In api mode the token came straight from the API over a
 * server-to-server call and the API verifies it on every request, so the client only decodes
 * it and never needs the API's signing key. Dev mode verifies the tokens it minted itself.
 */
export function tokenVerificationFromEnv(): JwtSettings {
  return authModeFromEnv() === "dev" ? jwtSettingsFromEnv() : {};
}

/** Options for the httpOnly session and refresh cookies; they expire with their token. */
export function sessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(expiresAt),
  };
}

export type TokenClaims = JWTPayload & Record<string, unknown>;

const MS_ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

/**
 * Validates the token's lifetime and required claims. When a signing key is
 * given the signature, issuer and audience are verified too (see tokenVerificationFromEnv).
 */
export async function readTokenClaims(token: string, settings: JwtSettings): Promise<TokenClaims | null> {
  try {
    const claims: TokenClaims = settings.signingKey
      ? (
          await jwtVerify(token, new TextEncoder().encode(settings.signingKey), {
            issuer: settings.issuer,
            audience: settings.audience,
            algorithms: ["HS256"],
            clockTolerance: 30,
          })
        ).payload
      : decodeJwt(token);

    if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) return null;
    if (!claims.sub) return null;
    return claims;
  } catch {
    return null;
  }
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return typeof value === "string" && value ? [value] : [];
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.length > 0);
}

export function rolesFromClaims(claims: TokenClaims) {
  return [...new Set([...toList(claims.role), ...toList(claims.roles), ...toList(claims[MS_ROLE_CLAIM])])];
}

export function userFromClaims(claims: TokenClaims) {
  const userId = claims.sub as string;
  return {
    userId,
    userName: firstString(claims.unique_name, claims.preferred_username, claims.name, userId) as string,
    displayName: firstString(claims.name, claims.given_name, claims.unique_name, claims.preferred_username, userId) as string,
    email: firstString(claims.email),
    roles: rolesFromClaims(claims),
    clientId: firstString(claims.client_id),
    expiresAt: (claims.exp as number) * 1000,
  };
}

/** Accepts only same-origin relative paths for post-login redirects. */
export function safeRedirectPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value === "/login" || value.startsWith("/login?")) return fallback;
  return value;
}
