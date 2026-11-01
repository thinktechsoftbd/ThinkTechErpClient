"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionSuccess, type ActionState } from "@/core/forms/action-state";
import { smsApi } from "../api";
import { smsModule } from "../module";
import type { SmsProviderUpsertRequest } from "../types";
import { checked, invalid, optionalText, requiredText, type FieldErrors } from "./form-input";

// Save and delete Server Actions for SMS providers. The API password and key are write-only.

/** Absolute http(s) address, as the API's [Url] check wants it. */
function baseUrl(formData: FormData, fieldErrors: FieldErrors) {
  const value = optionalText(formData, "apiBaseUrl", 500, fieldErrors);
  if (!value || fieldErrors.apiBaseUrl) return value;
  if (!URL.canParse(value) || !/^https?:$/.test(new URL(value).protocol)) {
    fieldErrors.apiBaseUrl = "Enter the full address, e.g. https://api.example.com.";
  }
  return value;
}

/**
 * A write-only secret: "Remove" ticked sends "" (removes it), a new value replaces it, and an empty
 * field sends null so the stored one is kept. Values are sent as typed (not trimmed).
 */
function secret(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  if (checked(formData, `${name}Remove`)) return "";
  const raw = formData.get(name);
  const value = typeof raw === "string" && raw.trim() ? raw : null;
  if (value && value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

function providerBody(formData: FormData, fieldErrors: FieldErrors): SmsProviderUpsertRequest {
  return {
    name: requiredText(formData, "name", 150, fieldErrors),
    code: requiredText(formData, "code", 50, fieldErrors).toUpperCase(),
    apiBaseUrl: baseUrl(formData, fieldErrors),
    apiUsername: optionalText(formData, "apiUsername", 150, fieldErrors),
    apiPassword: secret(formData, "apiPassword", 1000, fieldErrors),
    apiKey: secret(formData, "apiKey", 2000, fieldErrors),
    isActive: checked(formData, "isActive"),
  };
}

/** Creates (id = null) or updates a provider. The API answers 409 when the code is taken. */
export async function saveProviderAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = providerBody(formData, fieldErrors);
  const error = invalid(fieldErrors);
  if (error) return error;

  try {
    await requireModuleAccess(smsModule);
    if (id === null) await smsApi.providers.create(body);
    else await smsApi.providers.update(id, body);
  } catch (caught) {
    return toActionError(caught);
  }
  refresh();
  return actionSuccess(id === null ? "Provider added." : "Provider saved.");
}

/** The API refuses (409) a provider SMS were bought from or allocated with: deactivate it instead. */
export async function deleteProviderAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(smsModule);
    await smsApi.providers.remove(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Provider deleted.");
}
