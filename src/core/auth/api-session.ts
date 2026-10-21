import { apiBaseUrlFromEnv, readEnv } from "@/core/config/env";
import { readTokenClaims, tokenVerificationFromEnv } from "./token";

// Shared by the login Server Action and proxy.ts (session renewal), so no "server-only" here.

/** Body of the API's login and refresh responses (field names are matched loosely). */
export type AuthResponseBody = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  refreshToken?: string;
  refresh_token?: string;
  refreshTokenExpiresAt?: string;
};

export type ApiSession = {
  token: string;
  expiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
};

/** The API sends UTC timestamps without a zone designator; read those as UTC, not local time. */
function parseApiDate(value: unknown) {
  if (typeof value !== "string" || !value) return NaN;
  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
}

export async function readAuthResponse(
  body: AuthResponseBody,
): Promise<{ ok: true; session: ApiSession } | { ok: false; message: string }> {
  const token = body.accessToken ?? body.access_token ?? body.token;
  const claims = token ? await readTokenClaims(token, tokenVerificationFromEnv()) : null;
  if (!token || !claims?.exp) {
    return { ok: false, message: "The API returned an access token this app cannot read (missing, expired or without a subject)." };
  }
  const refreshToken = body.refreshToken ?? body.refresh_token;
  const refreshExpiresAt = parseApiDate(body.refreshTokenExpiresAt);
  if (!refreshToken || !Number.isFinite(refreshExpiresAt) || refreshExpiresAt <= Date.now()) {
    return { ok: false, message: "The API response is missing a valid refresh token. Please check the API auth response." };
  }
  return { ok: true, session: { token, expiresAt: claims.exp * 1000, refreshToken, refreshExpiresAt } };
}

export type RefreshOutcome =
  | { status: "renewed"; session: ApiSession }
  /** The API refused the refresh token: the session is over. */
  | { status: "rejected" }
  /** The API could not be reached or failed; keep the refresh token and try again later. */
  | { status: "unavailable" };

// When the access token runs out, several requests (navigation, prefetches, other tabs) arrive
// with the same refresh token. The API rotates refresh tokens and refuses a rotated-out one, so
// concurrent renewals share one API call, and requests that still carry the old cookie shortly
// afterwards reuse its result (inside the API's 30-second grace for parallel refreshes).
const REUSE_WINDOW_MS = 20_000;
const renewals = new Map<string, { outcome: Promise<RefreshOutcome>; startedAt: number }>();

export function refreshApiSession(refreshToken: string): Promise<RefreshOutcome> {
  const now = Date.now();
  for (const [key, renewal] of renewals) {
    if (now - renewal.startedAt > REUSE_WINDOW_MS) renewals.delete(key);
  }

  const existing = renewals.get(refreshToken);
  if (existing) return existing.outcome;

  const outcome = requestRefresh(refreshToken).then((result) => {
    // Don't pin a transient failure: the next request should try again.
    if (result.status === "unavailable") renewals.delete(refreshToken);
    return result;
  });
  renewals.set(refreshToken, { outcome, startedAt: now });
  return outcome;
}

async function requestRefresh(refreshToken: string): Promise<RefreshOutcome> {
  const path = readEnv("AUTH_REFRESH_PATH") ?? "/api/security/auth/refresh";
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrlFromEnv()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { status: "unavailable" };
  }

  if (response.status === 400 || response.status === 401 || response.status === 403) return { status: "rejected" };
  if (!response.ok) return { status: "unavailable" };

  const parsed = await readAuthResponse((await response.json().catch(() => ({}))) as AuthResponseBody);
  return parsed.ok ? { status: "renewed", session: parsed.session } : { status: "rejected" };
}
