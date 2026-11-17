import "server-only";
import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, positiveInteger, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { parseDecimal } from "@/core/utils/number";
import { warrantyModule } from "../module";

// Form readers shared by the warranty Server Actions (field errors keyed like the inputs).

export type FieldErrors = Record<string, string>;

/** Re-checks access, runs the API call, refreshes the page; API errors become form state. */
export async function mutate(call: () => Promise<unknown>, successMessage: string): Promise<ActionState> {
  try {
    await requireModuleAccess(warrantyModule);
    await call();
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(successMessage);
}

const MAX_AMOUNT = 999_999_999_999;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function invalid(fieldErrors: FieldErrors) {
  return actionError("Please correct the highlighted fields.", fieldErrors);
}

export function hasErrors(fieldErrors: FieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

export function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export function requiredText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (!value) fieldErrors[name] = "Required.";
  else if (value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

export function optionalText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value || null;
}

/** A whole number in [min, max]; empty gives `fallback`. */
export function readWhole(formData: FormData, name: string, range: { min: number; max: number }, fallback: number, fieldErrors: FieldErrors) {
  const raw = formString(formData, name).replace(/,/g, "");
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) {
    fieldErrors[name] = "Enter a whole number.";
    return fallback;
  }
  const value = Number(raw);
  if (value < range.min || value > range.max) fieldErrors[name] = `Enter ${range.min} to ${range.max}.`;
  return value;
}

/** An amount of 0 or more; empty gives `fallback`. */
export function readAmount<T extends number | null>(formData: FormData, name: string, fallback: T, fieldErrors: FieldErrors): number | T {
  const raw = formString(formData, name);
  if (!raw) return fallback;
  const value = parseDecimal(raw);
  if (value === null) {
    fieldErrors[name] = "Enter a number.";
    return fallback;
  }
  if (value < 0) fieldErrors[name] = "Can't be negative.";
  else if (value > MAX_AMOUNT) fieldErrors[name] = "Too large.";
  return value;
}

/** An optional picker value (an id); empty gives null. */
export function optionalId(formData: FormData, name: string, fieldErrors: FieldErrors) {
  if (!formString(formData, name)) return null;
  const id = positiveInteger(formData, name);
  if (id === null) fieldErrors[name] = "Choose a valid option.";
  return id;
}

/** A YYYY-MM-DD date; empty gives null (or a "Required." error). */
export function readDate(formData: FormData, name: string, fieldErrors: FieldErrors, required = false) {
  const value = formString(formData, name);
  if (!value) {
    if (required) fieldErrors[name] = "Required.";
    return null;
  }
  if (!DATE.test(value)) fieldErrors[name] = "Enter a date.";
  return value;
}

export function oneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}
