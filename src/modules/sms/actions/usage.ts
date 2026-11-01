"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionSuccess, type ActionState } from "@/core/forms/action-state";
import { smsApi } from "../api";
import { smsModule } from "../module";
import { invalid, smsCount, type FieldErrors } from "./form-input";

// What an organization used. `objectId` is the organization's Object Id.

/** Adds SMS the organization sent to its usage. The API answers 409 when it hasn't that many left. */
export async function recordUsageAction(objectId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const count = smsCount(formData, "smsCount", 1, 10_000_000, fieldErrors);
  const error = invalid(fieldErrors);
  if (error) return error;

  try {
    await requireModuleAccess(smsModule);
    await smsApi.organizations.addUsage(objectId, count);
  } catch (caught) {
    return toActionError(caught);
  }
  refresh();
  return actionSuccess("Usage recorded.");
}

/** Sets the organization's total usage (0 to what it was allocated), e.g. after a provider's report. */
export async function correctUsageAction(objectId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const usage = smsCount(formData, "smsUsage", 0, Number.MAX_SAFE_INTEGER, fieldErrors);
  const error = invalid(fieldErrors);
  if (error) return error;

  try {
    await requireModuleAccess(smsModule);
    await smsApi.organizations.setUsage(objectId, usage);
  } catch (caught) {
    return toActionError(caught);
  }
  refresh();
  return actionSuccess("Usage corrected.");
}
