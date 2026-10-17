"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, optionalString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { securityApi } from "./api";
import { securityModule } from "./module";
import { MIN_PASSWORD_LENGTH } from "./types";

const USER_NAME_PATTERN = /^[A-Za-z0-9._@-]{3,64}$/;
const ROLE_NAME_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function stringList(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name).filter((value): value is string => typeof value === "string" && !!value))];
}

function validateProfile(formData: FormData, fieldErrors: Record<string, string>) {
  const email = optionalString(formData, "email");
  const displayName = optionalString(formData, "displayName");
  if (email && (!EMAIL_PATTERN.test(email) || email.length > 256)) fieldErrors.email = "Enter a valid email address.";
  if (displayName && displayName.length > 200) fieldErrors.displayName = "Max 200 characters.";
  return { email, displayName, isActive: formData.get("isActive") === "on", roles: stringList(formData, "roles") };
}

function validatePassword(formData: FormData, fieldErrors: Record<string, string>) {
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : "";
  const confirm = typeof formData.get("confirmPassword") === "string" ? (formData.get("confirmPassword") as string) : "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (password !== confirm) {
    fieldErrors.confirmPassword = "Passwords do not match.";
  }
  return password;
}

export async function createUserAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: Record<string, string> = {};
  const userName = formString(formData, "userName");
  if (!USER_NAME_PATTERN.test(userName)) {
    fieldErrors.userName = "3–64 characters: letters, numbers, dots, dashes, underscores or @.";
  }
  const profile = validateProfile(formData, fieldErrors);
  const password = validatePassword(formData, fieldErrors);
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  let userId: string;
  try {
    await requireModuleAccess(securityModule);
    userId = (await securityApi.createUser({ userName, password, ...profile })).userId;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/security/users/${encodeURIComponent(userId)}`);
}

export async function updateUserAction(userId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: Record<string, string> = {};
  const profile = validateProfile(formData, fieldErrors);
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  try {
    await requireModuleAccess(securityModule);
    await securityApi.updateUser(userId, profile);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("User updated.");
}

export async function resetPasswordAction(userId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: Record<string, string> = {};
  const password = validatePassword(formData, fieldErrors);
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  try {
    await requireModuleAccess(securityModule);
    await securityApi.resetPassword(userId, password);
  } catch (error) {
    return toActionError(error);
  }
  return actionSuccess("Password reset. Share it with the user through a secure channel.");
}

function validateRole(formData: FormData) {
  const fieldErrors: Record<string, string> = {};
  const name = formString(formData, "name");
  const description = optionalString(formData, "description");
  if (!ROLE_NAME_PATTERN.test(name)) {
    fieldErrors.name = "Lowercase letters, numbers and underscores, starting with a letter (e.g. sms_admin).";
  }
  if (description && description.length > 500) fieldErrors.description = "Max 500 characters.";
  return { fieldErrors, body: { name, description, permissions: stringList(formData, "permissions") } };
}

export async function createRoleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const { fieldErrors, body } = validateRole(formData);
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  let roleId: string;
  try {
    await requireModuleAccess(securityModule);
    roleId = (await securityApi.createRole(body)).roleId;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/security/roles/${encodeURIComponent(roleId)}`);
}

export async function updateRoleAction(roleId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const { fieldErrors, body } = validateRole(formData);
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  try {
    await requireModuleAccess(securityModule);
    await securityApi.updateRole(roleId, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Role saved.");
}

export async function deleteRoleAction(roleId: string): Promise<ActionState> {
  try {
    await requireModuleAccess(securityModule);
    await securityApi.deleteRole(roleId);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/security/roles");
}
