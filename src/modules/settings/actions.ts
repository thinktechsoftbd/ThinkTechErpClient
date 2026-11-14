"use server";

import { refresh } from "next/cache";
import { requireModuleAccess, requirePermission } from "@/core/auth/guards";
import { formString, optionalString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { settingsApi } from "./api";
import { settingsModule } from "./module";
import {
  AREA_MANAGE_PERMISSION,
  AREA_NAME_MAX_LENGTH,
  AREA_TYPES,
  LOOKUP_NAME_MAX_LENGTH,
  type AreaType,
} from "./types";

type FieldErrors = Record<string, string>;

function requiredName(formData: FormData, fieldErrors: FieldErrors, maxLength = LOOKUP_NAME_MAX_LENGTH) {
  const name = formString(formData, "name");
  if (!name) fieldErrors.name = "Required.";
  else if (name.length > maxLength) fieldErrors.name = `Max ${maxLength} characters.`;
  return name;
}

function invalid(fieldErrors: FieldErrors) {
  return actionError("Please correct the highlighted fields.", fieldErrors);
}

// ---- Lookup tables

/** Creates (id = null) or updates a lookup table. */
export async function saveLookupTableAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = { name: requiredName(formData, fieldErrors), isActive: formData.get("isActive") === "on" };
  if (Object.keys(fieldErrors).length > 0) return invalid(fieldErrors);

  try {
    await requireModuleAccess(settingsModule);
    if (id === null) await settingsApi.createLookupTable(body);
    else await settingsApi.updateLookupTable(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Lookup table created." : "Lookup table saved.");
}

export async function deleteLookupTableAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(settingsModule);
    await settingsApi.deleteLookupTable(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Lookup table deleted.");
}

// ---- Lookup data

/** Creates (id = null) or updates a lookup value. */
export async function saveLookupDataAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const lookupTableId = Number(formString(formData, "lookupTableId"));
  if (!Number.isSafeInteger(lookupTableId) || lookupTableId <= 0) fieldErrors.lookupTableId = "Choose a lookup table.";
  const body = { lookupTableId, name: requiredName(formData, fieldErrors), isActive: formData.get("isActive") === "on" };
  if (Object.keys(fieldErrors).length > 0) return invalid(fieldErrors);

  try {
    await requireModuleAccess(settingsModule);
    if (id === null) await settingsApi.createLookupData(body);
    else await settingsApi.updateLookupData(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Value created." : "Value saved.");
}

export async function deleteLookupDataAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(settingsModule);
    await settingsApi.deleteLookupData(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Value deleted.");
}

// ---- Areas

/** Creates (id = null) or updates an area. */
export async function saveAreaAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};

  const districtId = Number(formString(formData, "districtId"));
  if (!Number.isSafeInteger(districtId) || districtId <= 0) fieldErrors.districtId = "Choose a district.";

  const areaType = formString(formData, "areaType") as AreaType;
  if (!AREA_TYPES.some((type) => type.value === areaType)) fieldErrors.areaType = "Choose an area type.";

  const nameBn = optionalString(formData, "nameBn");
  if (nameBn && nameBn.length > AREA_NAME_MAX_LENGTH)
    fieldErrors.nameBn = `Max ${AREA_NAME_MAX_LENGTH} characters.`;

  // An empty zone keeps the district's zone (halves the form as "Same as district").
  const zoneRaw = formString(formData, "shippingZoneId");
  const shippingZoneId = zoneRaw ? Number(zoneRaw) : null;
  if (shippingZoneId !== null && (!Number.isSafeInteger(shippingZoneId) || shippingZoneId <= 0))
    fieldErrors.shippingZoneId = "Choose a shipping zone.";

  const body = {
    districtId,
    name: requiredName(formData, fieldErrors, AREA_NAME_MAX_LENGTH),
    nameBn,
    areaType,
    shippingZoneId,
    isActive: formData.get("isActive") === "on",
  };
  if (Object.keys(fieldErrors).length > 0) return invalid(fieldErrors);

  try {
    await requirePermission(AREA_MANAGE_PERMISSION);
    if (id === null) await settingsApi.createArea(body);
    else await settingsApi.updateArea(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Area created." : "Area saved.");
}

export async function deleteAreaAction(id: number): Promise<ActionState> {
  try {
    await requirePermission(AREA_MANAGE_PERMISSION);
    await settingsApi.deleteArea(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Area deleted.");
}

