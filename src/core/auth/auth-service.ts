import "server-only";
import { timingSafeEqual } from "node:crypto";
import { SignJWT } from "jose";
import { serverEnv } from "@/core/config/server-env";
import { readAuthResponse, type AuthResponseBody } from "./api-session";

export type SignInResult =
  | { ok: true; token: string; expiresAt: number; refreshToken?: string; refreshExpiresAt?: number }
  | { ok: false; message: string };

const DEV_TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

export async function signIn(email: string, password: string): Promise<SignInResult> {
  return serverEnv.authMode === "dev" ? signInDev(email, password) : signInWithApi(email, password);
}

async function signInWithApi(email: string, password: string): Promise<SignInResult> {
  const url = `${serverEnv.apiBaseUrl}${serverEnv.authLoginPath}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      redirect: "manual",
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined;
    const detail = cause ? ` (${cause})` : "";
    return {
      ok: false,
      message: `Could not connect to ${url}${detail}. Check that ThinkTechErpAPI is running and its HTTPS certificate is trusted.`,
    };
  }

  if (response.status === 404 || response.status === 405) {
    return {
      ok: false,
      message: `The API has no login endpoint at ${serverEnv.authLoginPath}. Add it to ThinkTechErpAPI (see README) or use AUTH_MODE=dev locally.`,
    };
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    return {
      ok: false,
      message: location
        ? `The API redirected the login request to ${location}. Set API_BASE_URL to the API's final HTTPS address and restart the client.`
        : `The API redirected the login request (HTTP ${response.status}). Set API_BASE_URL to the API's final HTTPS address and restart the client.`,
    };
  }
  if (response.status === 403) {
    return { ok: false, message: "This account is inactive. Contact your administrator." };
  }
  if (response.status === 400 || response.status === 401) {
    return { ok: false, message: "Invalid email or password." };
  }
  if (response.status === 429) {
    return { ok: false, message: "Too many sign-in attempts. Please wait a minute and try again." };
  }
  if (!response.ok) {
    return { ok: false, message: `Sign-in failed (HTTP ${response.status}). Please try again.` };
  }

  const parsed = await readAuthResponse((await response.json().catch(() => ({}))) as AuthResponseBody);
  return parsed.ok ? { ok: true, ...parsed.session } : parsed;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * Development-only sign-in: checks DEV_AUTH_* credentials and mints a token
 * signed with the API's JWT settings, so the real API accepts it.
 */
async function signInDev(userName: string, password: string): Promise<SignInResult> {
  const { issuer, audience, signingKey } = serverEnv.jwt;
  const devUser = serverEnv.devUser;
  if (!devUser.password || !issuer || !audience || !signingKey) {
    return {
      ok: false,
      message:
        "Dev sign-in needs DEV_AUTH_PASSWORD and AUTH_JWT_ISSUER / AUTH_JWT_AUDIENCE / AUTH_JWT_SIGNING_KEY in .env.local.",
    };
  }
  if (!safeEqual(userName, devUser.userName) || !safeEqual(password, devUser.password)) {
    return { ok: false, message: "Invalid user name or password." };
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + DEV_TOKEN_LIFETIME_SECONDS;
  const token = await new SignJWT({
    name: devUser.userName,
    unique_name: devUser.userName,
    role: devUser.roles,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(`dev:${devUser.userName}`)
    .setJti(crypto.randomUUID())
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(signingKey));

  return { ok: true, token, expiresAt: expiresAt * 1000 };
}

/** Tells the API the session ended (best effort; the cookie is cleared regardless). */
export async function signOut(refreshToken?: string) {
  if (serverEnv.authMode === "dev") return;
  if (!refreshToken) return;
  try {
    await fetch(`${serverEnv.apiBaseUrl}${serverEnv.authLogoutPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Logout must succeed locally even if the API is unreachable.
  }
}
