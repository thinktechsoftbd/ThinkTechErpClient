"use server";

import { redirect } from "next/navigation";
import { appConfig } from "@/core/config/app";
import { actionError, type ActionState } from "@/core/forms/action-state";
import { formString } from "@/core/forms/action-errors";
import { signIn, signOut } from "./auth-service";
import { clearSessionCookie, getRefreshToken, setRefreshCookie, setSessionCookie } from "./session";
import { safeRedirectPath } from "./token";

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = formString(formData, "email");
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";

  const fieldErrors: Record<string, string> = {};
  if (!email) fieldErrors.email = "Enter your email address.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length > 0) return actionError("Please fill in all fields.", fieldErrors);

  const result = await signIn(email, password);
  if (!result.ok) return actionError(result.message);

  await setSessionCookie(result.token, result.expiresAt);
  if (result.refreshToken && result.refreshExpiresAt) {
    await setRefreshCookie(result.refreshToken, result.refreshExpiresAt);
  }
  redirect(safeRedirectPath(formData.get("next"), appConfig.homePath));
}

export async function logoutAction() {
  const refreshToken = await getRefreshToken();
  if (refreshToken) await signOut(refreshToken);
  await clearSessionCookie();
  // proxy.ts also drops both cookies on ?signedOut, in case it renewed them during this request.
  redirect(`${appConfig.loginPath}?signedOut=1`);
}
