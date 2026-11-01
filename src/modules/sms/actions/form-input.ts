import "server-only";
import { formString, optionalString } from "@/core/forms/action-errors";
import { actionError } from "@/core/forms/action-state";
import { parseDecimal } from "@/core/utils/number";

// Field readers shared by the SMS Server Actions. Limits mirror the API's request models so most
// mistakes are caught before the round trip; each reader records its message in `fieldErrors`.

export type FieldErrors = Record<string, string>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The form state for a submit with field errors, or null when there are none. */
export function invalid(fieldErrors: FieldErrors) {
  return Object.keys(fieldErrors).length > 0 ? actionError("Please correct the highlighted fields.", fieldErrors) : null;
}

export function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

/** Required text limited to `max` characters. */
export function requiredText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (!value) fieldErrors[name] = "Required.";
  else if (value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

/** Optional text limited to `max` characters; empty gives null. */
export function optionalText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = optionalString(formData, name);
  if (value && value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

/** A required id picked from a select. */
export function requiredId(formData: FormData, name: string, message: string, fieldErrors: FieldErrors) {
  const id = Number(formString(formData, name));
  if (Number.isSafeInteger(id) && id > 0) return id;
  fieldErrors[name] = message;
  return 0;
}

/** A required Object Id (UUID) picked from a select. */
export function requiredGuid(formData: FormData, name: string, message: string, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (GUID_PATTERN.test(value)) return value;
  fieldErrors[name] = message;
  return "";
}

/** A required calendar date (YYYY-MM-DD). */
export function requiredDate(formData: FormData, name: string, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (!DATE_PATTERN.test(value)) fieldErrors[name] = "Choose a date.";
  return value;
}

/** A required whole number of SMS in [min, max]; thousands separators are allowed. */
export function smsCount(formData: FormData, name: string, min: number, max: number, fieldErrors: FieldErrors) {
  const raw = formString(formData, name).replace(/,/g, "");
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
    fieldErrors[name] = `Enter a whole number from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}.`;
    return min;
  }
  return value;
}

/** A decimal in [min, max]; empty gives null (`required` records an error for it). */
export function decimal(
  formData: FormData,
  name: string,
  range: { min: number; max: number; required?: boolean },
  fieldErrors: FieldErrors,
) {
  const raw = formString(formData, name);
  if (!raw) {
    if (range.required) fieldErrors[name] = "Required.";
    return null;
  }
  const value = parseDecimal(raw);
  if (value === null || value < range.min || value > range.max) {
    fieldErrors[name] = `Enter a number from ${range.min.toLocaleString("en-US")} to ${range.max.toLocaleString("en-US")}.`;
    return null;
  }
  return value;
}
