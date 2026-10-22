import "server-only";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/core/config/app";
import {
  REFRESH_COOKIE,
  SESSION_COOKIE,
  readTokenClaims,
  sessionCookieOptions,
  tokenVerificationFromEnv,
  userFromClaims,
} from "./token";

export type Session = ReturnType<typeof userFromClaims>;

// proxy.ts renews an expiring access token from the refresh cookie before the request gets
// here, so these readers only ever see the current token.

/** The session token and its claims, or null when missing or expired. */
async function readSessionToken() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // The expiry check reads the clock. Partial Prefetching prerenders signed-in routes with
  // the request's cookies, where reading the time is an error; io() stops the prerender here
  // and resolves immediately for real requests and Server Actions.
  await io();
  const claims = await readTokenClaims(token, tokenVerificationFromEnv());
  return claims ? { token, claims } : null;
}

/** The current access token, or undefined when missing or expired. */
export async function getAccessToken() {
  return (await readSessionToken())?.token;
}

export async function getSession(): Promise<Session | null> {
  const session = await readSessionToken();
  return session ? userFromClaims(session.claims) : null;
}

/** Data Access Layer guard: returns the session or sends the user to sign in. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`${appConfig.loginPath}?expired=1`);
  return session;
}

export async function setSessionCookie(token: string, expiresAt: number) {
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function setRefreshCookie(token: string, expiresAt: number) {
  (await cookies()).set(REFRESH_COOKIE, token, sessionCookieOptions(expiresAt));
}

export async function getRefreshToken() {
  return (await cookies()).get(REFRESH_COOKIE)?.value;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}
