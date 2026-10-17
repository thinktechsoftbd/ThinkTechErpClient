import { decodeJwt, jwtVerify, type JWTPayload } from "jose";

/** Session cookie holding the API access token (httpOnly, never readable by browser JS). */
export const SESSION_COOKIE = "tt_session";

export type JwtSettings = {
  issuer?: string;
  audience?: string;
  signingKey?: string;
};

/** Reads JWT settings straight from the environment (usable from proxy.ts). */
export function jwtSettingsFromEnv(): JwtSettings {
  const read = (name: string) => process.env[name]?.trim() || undefined;
  return {
    issuer: read("AUTH_JWT_ISSUER"),
    audience: read("AUTH_JWT_AUDIENCE"),
    signingKey: read("AUTH_JWT_SIGNING_KEY"),
  };
}

export type TokenClaims = JWTPayload & Record<string, unknown>;

const MS_ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

/**
 * Validates the token's lifetime and required claims. When a signing key is
 * configured the signature is verified too; otherwise the API remains the
 * authority and verifies it on every call.
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
