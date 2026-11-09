"use server";

import { redirect } from "next/navigation";
import { appConfig } from "@/core/config/app";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { formString } from "@/core/forms/action-errors";
import { requestPasswordReset, resetPassword, signIn, signOut } from "./auth-service";
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

// Same rules as the API's password policy and its email check.
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_BYTES = 72;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Forgot password: the API emails a reset link if the address belongs to an active account. */
export async function forgotPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const email = formString(formData, "email");
  if (!email || email.length > 256 || !EMAIL_PATTERN.test(email))
    return actionError("Enter the email address of your account.", { email: "Enter a valid email address." });

  const result = await requestPasswordReset(email);
  if (!result.ok) return actionError(result.message);
  return actionSuccess(
    `If ${email} belongs to an active account, we've emailed it a link to reset the password. ` +
      "The link works for 30 minutes. Check your spam folder if it doesn't arrive.",
  );
}

/** Reset password: the token from the emailed link and the new password, twice. */
export async function resetPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const token = formString(formData, "token");
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const confirm = typeof formData.get("confirmPassword") === "string" ? (formData.get("confirmPassword") as string) : "";
  if (!token) return actionError("This reset link is incomplete. Open the link from the email again, or ask for a new one.");

  const fieldErrors: Record<string, string> = {};
  if (password.length < MIN_PASSWORD_LENGTH) fieldErrors.password = `At least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) fieldErrors.password = `At most ${MAX_PASSWORD_BYTES} plain characters.`;
  if (confirm !== password) fieldErrors.confirmPassword = "The two passwords don't match.";
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  const result = await resetPassword(token, password);
  if (!result.ok) return actionError(result.message);
  redirect(`${appConfig.loginPath}?reset=1`);
}
