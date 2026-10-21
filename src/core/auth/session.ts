import "server-only";
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

/** The current access token, or undefined when missing or expired. */
export async function getAccessToken() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  return (await readTokenClaims(token, tokenVerificationFromEnv())) ? token : undefined;
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await readTokenClaims(token, tokenVerificationFromEnv());
  return claims ? userFromClaims(claims) : null;
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
