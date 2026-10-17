import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { appConfig } from "@/core/config/app";
import { serverEnv } from "@/core/config/server-env";
import { SESSION_COOKIE, readTokenClaims, userFromClaims } from "./token";

export type Session = ReturnType<typeof userFromClaims>;

/** The current access token, or undefined when missing or expired. */
export async function getAccessToken() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  return (await readTokenClaims(token, serverEnv.jwt)) ? token : undefined;
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims = await readTokenClaims(token, serverEnv.jwt);
  return claims ? userFromClaims(claims) : null;
}

/** Data Access Layer guard: returns the session or sends the user to sign in. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(`${appConfig.loginPath}?expired=1`);
  return session;
}

export async function setSessionCookie(token: string, expiresAt: number) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}
