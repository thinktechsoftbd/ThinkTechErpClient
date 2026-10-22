"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, optionalString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { securityApi } from "./api";
import { securityModule } from "./module";
import {
  EMAIL_PATTERN,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  PERMISSION_CODE_PATTERN,
  USER_STATUSES,
  type OrganizationUpsertRequest,
  type UserMenuAccessItem,
  type UserStatus,
} from "./types";

type FieldErrors = Record<string, string>;

function hasErrors(fieldErrors: FieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

function invalid(fieldErrors: FieldErrors) {
  return actionError("Please correct the highlighted fields.", fieldErrors);
}

/** Optional text field limited to `max` characters. */
function text(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = optionalString(formData, name);
  if (value && value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

/** Required text field limited to `max` characters. */
function requiredText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (!value) fieldErrors[name] = "Required.";
  else if (value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

function email(formData: FormData, name: string, max: number, fieldErrors: FieldErrors, required: boolean) {
  const value = optionalString(formData, name);
  if (!value) {
    if (required) fieldErrors[name] = "Required.";
  } else if (!EMAIL_PATTERN.test(value) || value.length > max) {
    fieldErrors[name] = "Enter a valid email address.";
  }
  return value;
}

/** Checked ids from checkboxes named `name`. */
function ids(formData: FormData, name: string) {
  return [...new Set(formData.getAll(name).map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))];
}

function status(formData: FormData): UserStatus {
  const value = formString(formData, "status");
  return (USER_STATUSES as readonly string[]).includes(value) ? (value as UserStatus) : "ACTIVE";
}

function password(formData: FormData, fieldErrors: FieldErrors, name = "password") {
  const value = typeof formData.get(name) === "string" ? (formData.get(name) as string) : "";
  const confirm = typeof formData.get("confirmPassword") === "string" ? (formData.get("confirmPassword") as string) : "";
  if (value.length < MIN_PASSWORD_LENGTH) fieldErrors[name] = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (Buffer.byteLength(value, "utf8") > MAX_PASSWORD_BYTES) fieldErrors[name] = `Use at most ${MAX_PASSWORD_BYTES} bytes.`;
  else if (value !== confirm) fieldErrors.confirmPassword = "Passwords do not match.";
  return value;
}

// ---- Organizations

function organizationBody(formData: FormData, fieldErrors: FieldErrors): OrganizationUpsertRequest {
  return {
    nameEn: requiredText(formData, "nameEn", 200, fieldErrors),
    nameBn: text(formData, "nameBn", 200, fieldErrors),
    slogan: text(formData, "slogan", 500, fieldErrors),
    code: text(formData, "code", 50, fieldErrors),
    email: email(formData, "email", 150, fieldErrors, false),
    phone: text(formData, "phone", 50, fieldErrors),
    website: text(formData, "website", 255, fieldErrors),
    addressLine1: text(formData, "addressLine1", 255, fieldErrors),
    addressLine2: text(formData, "addressLine2", 255, fieldErrors),
    city: text(formData, "city", 100, fieldErrors),
    state: text(formData, "state", 100, fieldErrors),
    postalCode: text(formData, "postalCode", 20, fieldErrors),
    country: text(formData, "country", 100, fieldErrors),
    logoUrl: text(formData, "logoUrl", 500, fieldErrors),
    isActive: formData.get("isActive") === "on",
  };
}

/** Creates (id = null) or updates an organization. */
export async function saveOrganizationAction(
  id: number | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = organizationBody(formData, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  let createdId: number;
  try {
    await requireModuleAccess(securityModule);
    if (id !== null) {
      await securityApi.updateOrganization(id, body);
      refresh();
      return actionSuccess("Organization saved.");
    }
    createdId = (await securityApi.createOrganization(body)).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/security/organizations/${createdId}`);
}

// ---- Permissions

/** Creates (id = null) or updates a permission. */
export async function savePermissionAction(
  id: number | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const code = formString(formData, "code").toUpperCase();
  if (!PERMISSION_CODE_PATTERN.test(code) || code.length > 100) {
    fieldErrors.code = "Use uppercase MODULE.ACTION, e.g. PATIENT.V.";
  }
  const body = {
    code,
    name: requiredText(formData, "name", 200, fieldErrors),
    description: text(formData, "description", 500, fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  let createdId: number;
  try {
    await requireModuleAccess(securityModule);
    if (id !== null) {
      await securityApi.updatePermission(id, body);
      refresh();
      return actionSuccess("Permission saved.");
    }
    createdId = (await securityApi.createPermission(body)).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/security/permissions/${createdId}`);
}

export async function deletePermissionAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(securityModule);
    await securityApi.deletePermission(id);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/security/permissions");
}

// ---- Roles

/** Creates (id = null) or updates a role and its permissions. */
export async function saveRoleAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = {
    name: requiredText(formData, "name", 100, fieldErrors),
    description: text(formData, "description", 500, fieldErrors),
    permissionIds: ids(formData, "permissionIds"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  let createdId: number;
  try {
    await requireModuleAccess(securityModule);
    if (id !== null) {
      await securityApi.updateRole(id, body);
      refresh();
      return actionSuccess("Role saved.");
    }
    createdId = (await securityApi.createRole(body)).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/security/roles/${createdId}`);
}

export async function deleteRoleAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(securityModule);
    await securityApi.deleteRole(id);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/security/roles");
}

// ---- Users

function userProfile(formData: FormData, fieldErrors: FieldErrors) {
  return {
    name: requiredText(formData, "name", 200, fieldErrors),
    email: email(formData, "email", 256, fieldErrors, true) ?? "",
    photoUrl: text(formData, "photoUrl", 500, fieldErrors),
    status: status(formData),
    roleIds: ids(formData, "roleIds"),
  };
}

export async function createUserAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const profile = userProfile(formData, fieldErrors);
  const newPassword = password(formData, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  let createdId: number;
  try {
    await requireModuleAccess(securityModule);
    createdId = (await securityApi.createUser({ ...profile, password: newPassword })).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/security/users/${createdId}`);
}

export async function updateUserAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const profile = userProfile(formData, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(securityModule);
    await securityApi.updateUser(id, profile);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("User saved.");
}

export async function setPasswordAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const newPassword = password(formData, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(securityModule);
    await securityApi.setPassword(id, newPassword);
  } catch (error) {
    return toActionError(error);
  }
  return actionSuccess("Password changed. Share it with the user through a secure channel.");
}

export async function setUserPermissionsAction(
  id: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireModuleAccess(securityModule);
    await securityApi.setUserPermissions(id, ids(formData, "permissionIds"));
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Direct permissions saved. They apply from the user's next token renewal.");
}

/** Saves per-user menu overrides; menus left on "Default" follow their role. */
export async function setUserMenusAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const flag = (menuId: number, name: string) => formData.get(`menu.${menuId}.${name}`) === "on";
  const menus: UserMenuAccessItem[] = ids(formData, "menuIds")
    .filter((menuId) => flag(menuId, "custom"))
    .map((menuId) => ({
      menuId,
      canView: flag(menuId, "view"),
      canCreate: flag(menuId, "create"),
      canEdit: flag(menuId, "edit"),
      canDelete: flag(menuId, "delete"),
    }));

  try {
    await requireModuleAccess(securityModule);
    await securityApi.setUserMenus(id, menus);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Menu access saved.");
}
