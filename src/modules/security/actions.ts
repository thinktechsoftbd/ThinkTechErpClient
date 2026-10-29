"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, optionalString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { securityApi } from "./api";
import { securityModule } from "./module";
import {
  BILLING_PERIOD_TYPES,
  EMAIL_PATTERN,
  MENU_GROUP_PATH,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
  PERMISSION_CODE_PATTERN,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_TYPES,
  USER_STATUSES,
  type MenuUpsertRequest,
  type OrganizationUpsertRequest,
  type SubscriptionUpsertRequest,
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

// ---- Menus

/** Optional positive id from a select; null for "none". */
function optionalId(formData: FormData, name: string) {
  const id = Number(formString(formData, name));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Creates (id = null) or updates a menu row (security."Menu"). */
export async function saveMenuAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const title = requiredText(formData, "title", 100, fieldErrors);
  const path = requiredText(formData, "path", 300, fieldErrors);
  if (path && path !== MENU_GROUP_PATH && !/^\/[^\s]*$/.test(path)) {
    fieldErrors.path = `Use a page route starting with "/" (e.g. /sms/clients), or "${MENU_GROUP_PATH}" for a group.`;
  }
  const icon = text(formData, "icon", 100, fieldErrors);
  const sortOrderRaw = formString(formData, "sortOrder") || "0";
  const sortOrder = Number(sortOrderRaw);
  if (!/^-?\d+$/.test(sortOrderRaw) || !Number.isSafeInteger(sortOrder)) fieldErrors.sortOrder = "Enter a whole number.";
  const parentId = optionalId(formData, "parentId");
  if (id !== null && parentId === id) fieldErrors.parentId = "A menu cannot be its own parent.";
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  const body: MenuUpsertRequest = {
    title,
    path,
    // Store Lucide names in kebab-case ("LayoutDashboard" → "layout-dashboard").
    icon: icon ? icon.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase() : null,
    sortOrder,
    parentId,
    roleId: optionalId(formData, "roleId"),
    isActive: formData.get("isActive") === "on",
  };

  let createdId: number;
  try {
    await requireModuleAccess(securityModule);
    if (id !== null) {
      await securityApi.updateMenu(id, body);
      // Also re-renders the sidebar, which is built from the menu table.
      refresh();
      return actionSuccess("Menu saved.");
    }
    createdId = (await securityApi.createMenu(body)).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/security/menus/${createdId}`);
}

export async function deleteMenuAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(securityModule);
    await securityApi.deleteMenu(id);
  } catch (error) {
    return toActionError(error);
  }
  redirect("/security/menus");
}

// ---- Subscription modules

/** Creates (id = null) or updates a subscription module. */
export async function saveSubscriptionModuleAction(
  id: number | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = {
    moduleName: requiredText(formData, "moduleName", 200, fieldErrors),
    remarks: text(formData, "remarks", 1000, fieldErrors),
    isActive: formData.get("isActive") === "on",
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(securityModule);
    if (id === null) await securityApi.createSubscriptionModule(body);
    else await securityApi.updateSubscriptionModule(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Subscription module created." : "Subscription module saved.");
}

export async function deleteSubscriptionModuleAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(securityModule);
    await securityApi.deleteSubscriptionModule(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Subscription module deleted.");
}

// ---- Subscriptions

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function requiredId(formData: FormData, name: string, message: string, fieldErrors: FieldErrors) {
  const id = Number(formString(formData, name));
  if (!Number.isSafeInteger(id) || id <= 0) fieldErrors[name] = message;
  return id;
}

function oneOf<T extends string>(formData: FormData, name: string, allowed: readonly T[], fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (!(allowed as readonly string[]).includes(value)) fieldErrors[name] = `Choose ${allowed.join(" or ")}.`;
  return value as T;
}

/** A decimal field; empty uses `fallback`. Rejects values outside [min, max]. */
function decimal(formData: FormData, name: string, fallback: number, min: number, max: number, fieldErrors: FieldErrors) {
  const raw = formString(formData, name).replace(/,/g, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!/^\d+(\.\d+)?$/.test(raw) || value < min || value > max) {
    fieldErrors[name] = `Enter a number from ${min} to ${max.toLocaleString("en-US")}.`;
  }
  return value;
}

/** Creates (id = null) or updates a subscription; the API calculates the total. */
export async function saveSubscriptionAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const startDate = formString(formData, "startDate");
  if (!DATE_PATTERN.test(startDate)) fieldErrors.startDate = "Choose a start date.";
  const endDate = formString(formData, "endDate") || null;
  if (endDate && !DATE_PATTERN.test(endDate)) fieldErrors.endDate = "Choose a valid date, or leave it empty.";
  else if (endDate && endDate < startDate) fieldErrors.endDate = "Must be on or after the start date.";

  const billingPeriodCount = Number(formString(formData, "billingPeriodCount"));
  if (!Number.isInteger(billingPeriodCount) || billingPeriodCount < 1 || billingPeriodCount > 120) {
    fieldErrors.billingPeriodCount = "Enter a whole number from 1 to 120.";
  }

  const subtotalAmount = decimal(formData, "subtotalAmount", 0, 0, 9_999_999_999_999_999, fieldErrors);
  const discountPercentage = decimal(formData, "discountPercentage", 0, 0, 100, fieldErrors);
  // A percentage overrides the amount (the API calculates it), so a disabled amount field is fine.
  const discountAmount = discountPercentage > 0 ? 0 : decimal(formData, "discountAmount", 0, 0, 9_999_999_999_999_999, fieldErrors);
  if (discountPercentage === 0 && discountAmount > subtotalAmount) {
    fieldErrors.discountAmount = "Can't be more than the subtotal.";
  }

  const body: SubscriptionUpsertRequest = {
    organizationId: requiredId(formData, "organizationId", "Choose an organization.", fieldErrors),
    subscriptionModuleId: requiredId(formData, "subscriptionModuleId", "Choose a module.", fieldErrors),
    subscriptionType: oneOf(formData, "subscriptionType", SUBSCRIPTION_TYPES, fieldErrors),
    billingPeriodType: oneOf(formData, "billingPeriodType", BILLING_PERIOD_TYPES, fieldErrors),
    billingPeriodCount,
    startDate,
    endDate,
    currencyLookupDataId: requiredId(formData, "currencyLookupDataId", "Choose a currency.", fieldErrors),
    localExchangeRate: decimal(formData, "localExchangeRate", 1, 0.000001, 999_999_999_999, fieldErrors),
    subtotalAmount,
    discountPercentage,
    discountAmount,
    vatAmount: decimal(formData, "vatAmount", 0, 0, 9_999_999_999_999_999, fieldErrors),
    status: oneOf(formData, "status", SUBSCRIPTION_STATUSES, fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(securityModule);
    if (id === null) await securityApi.createSubscription(body);
    else await securityApi.updateSubscription(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Subscription created." : "Subscription saved.");
}

export async function deleteSubscriptionAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(securityModule);
    await securityApi.deleteSubscription(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Subscription deleted.");
}
