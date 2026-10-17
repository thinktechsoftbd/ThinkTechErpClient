"use server";

import { redirect } from "next/navigation";
import { appConfig } from "@/core/config/app";
import { actionError, type ActionState } from "@/core/forms/action-state";
import { formString } from "@/core/forms/action-errors";
import { signIn, signOut } from "./auth-service";
import { clearSessionCookie, getAccessToken, setSessionCookie } from "./session";
import { safeRedirectPath } from "./token";

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const userName = formString(formData, "userName");
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";

  const fieldErrors: Record<string, string> = {};
  if (!userName) fieldErrors.userName = "Enter your user name.";
  if (!password) fieldErrors.password = "Enter your password.";
  if (Object.keys(fieldErrors).length > 0) return actionError("Please fill in all fields.", fieldErrors);

  const result = await signIn(userName, password);
  if (!result.ok) return actionError(result.message);

  await setSessionCookie(result.token, result.expiresAt);
  redirect(safeRedirectPath(formData.get("next"), appConfig.homePath));
}

export async function logoutAction() {
  const token = await getAccessToken();
  if (token) await signOut(token);
  await clearSessionCookie();
  redirect(appConfig.loginPath);
}
