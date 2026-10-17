import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, jwtSettingsFromEnv, readTokenClaims, safeRedirectPath } from "@/core/auth/token";

const LOGIN_PATH = "/login";

/**
 * Optimistic route guard: sends visitors without a live session to /login and
 * signed-in users away from it. Pages and Server Actions still re-check the
 * session, and the API authorizes every call.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await readTokenClaims(token, jwtSettingsFromEnv()) : null;

  if (pathname === LOGIN_PATH) {
    // `expired` is set when the API rejected the token; drop the stale cookie.
    if (searchParams.has("expired") || (token && !claims)) {
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    if (claims) {
      return NextResponse.redirect(new URL(safeRedirectPath(searchParams.get("next")), request.url));
    }
    return NextResponse.next();
  }

  if (!claims) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next.js internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
