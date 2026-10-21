import { NextResponse, type NextRequest } from "next/server";
import { refreshApiSession, type ApiSession } from "@/core/auth/api-session";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  readTokenClaims,
  safeRedirectPath,
  sessionCookieOptions,
  tokenVerificationFromEnv,
} from "@/core/auth/token";
import { authModeFromEnv } from "@/core/config/env";

const LOGIN_PATH = "/login";

/** Renew this long before the access token expires, so a render never starts with a dying token. */
const RENEW_BEFORE_EXPIRY_MS = 60_000;

type SessionState = {
  signedIn: boolean;
  /** New tokens from the API's refresh endpoint, to store and pass on to this request. */
  renewed?: ApiSession;
  /** The session is over: drop both cookies. */
  ended: boolean;
};

/**
 * Optimistic route guard and session keeper: renews the API access token from the refresh
 * cookie when it is missing or about to expire, sends visitors without a live session to
 * /login and signed-in users away from it. Pages and Server Actions still re-check the
 * session, and the API authorizes every call.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const onLoginPage = pathname === LOGIN_PATH;

  // `expired` is set when the API rejected the token and `signedOut` by logout; the whole session ends.
  const sessionEnded = onLoginPage && (searchParams.has("expired") || searchParams.has("signedOut"));
  const state: SessionState = sessionEnded ? { signedIn: false, ended: true } : await resolveSession(request);

  // Make renewed or removed cookies visible to the page rendering this request.
  if (state.renewed) {
    request.cookies.set(SESSION_COOKIE, state.renewed.token);
    request.cookies.set(REFRESH_COOKIE, state.renewed.refreshToken);
  } else if (state.ended) {
    request.cookies.delete([SESSION_COOKIE, REFRESH_COOKIE]);
  }
  const cookiesChanged = !!state.renewed || state.ended;

  let response: NextResponse;
  if (onLoginPage && state.signedIn) {
    response = NextResponse.redirect(new URL(safeRedirectPath(searchParams.get("next")), request.url));
  } else if (!onLoginPage && !state.signedIn) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    response = NextResponse.redirect(loginUrl);
  } else {
    response = cookiesChanged ? NextResponse.next({ request: { headers: request.headers } }) : NextResponse.next();
  }

  if (state.renewed) {
    response.cookies.set(SESSION_COOKIE, state.renewed.token, sessionCookieOptions(state.renewed.expiresAt));
    response.cookies.set(REFRESH_COOKIE, state.renewed.refreshToken, sessionCookieOptions(state.renewed.refreshExpiresAt));
  } else if (state.ended) {
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
  }
  return response;
}

async function resolveSession(request: NextRequest): Promise<SessionState> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await readTokenClaims(token, tokenVerificationFromEnv()) : null;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const expiresSoon = !claims || (claims.exp as number) * 1000 - Date.now() < RENEW_BEFORE_EXPIRY_MS;
  if (!expiresSoon || !refreshToken || authModeFromEnv() !== "api") {
    return { signedIn: !!claims, ended: !!token && !claims };
  }

  const outcome = await refreshApiSession(refreshToken);
  if (outcome.status === "renewed") return { signedIn: true, renewed: outcome.session, ended: false };
  if (outcome.status === "rejected") return { signedIn: false, ended: true };
  // API unreachable: keep the refresh cookie for a later request; a still-valid token keeps working.
  return { signedIn: !!claims, ended: false };
}

export const config = {
  // Everything except Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
