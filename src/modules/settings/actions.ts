"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { settingsApi } from "./api";
import { settingsModule } from "./module";
import { LOOKUP_NAME_MAX_LENGTH } from "./types";

type FieldErrors = Record<string, string>;

function requiredName(formData: FormData, fieldErrors: FieldErrors) {
  const name = formString(formData, "name");
  if (!name) fieldErrors.name = "Required.";
  else if (name.length > LOOKUP_NAME_MAX_LENGTH) fieldErrors.name = `Max ${LOOKUP_NAME_MAX_LENGTH} characters.`;
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
