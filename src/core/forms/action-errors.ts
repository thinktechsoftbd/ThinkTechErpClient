import "server-only";
import { ApiError } from "@/core/api/errors";
import { actionError, type ActionState } from "./action-state";

/** Converts an ApiError into form state. Anything else (including redirects) is rethrown. */
export function toActionError(error: unknown): ActionState {
  if (error instanceof ApiError) return actionError(error.message, error.fieldErrors);
  throw error;
}

export function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalString(formData: FormData, name: string) {
  return formString(formData, name) || null;
}

/** Parses a positive whole number field; returns null when invalid. */
export function positiveInteger(formData: FormData, name: string) {
  const raw = formString(formData, name).replace(/,/g, "");
  if (!/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}
