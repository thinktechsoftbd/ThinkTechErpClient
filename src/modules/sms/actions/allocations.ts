"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionSuccess, type ActionState } from "@/core/forms/action-state";
import { smsApi } from "../api";
import { smsModule } from "../module";
import type { SmsAllocationUpsertRequest } from "../types";
import { invalid, optionalText, requiredDate, requiredGuid, requiredId, smsCount, type FieldErrors } from "./form-input";

// Save and delete Server Actions for SMS allocated to organizations from a provider's stock.

function allocationBody(formData: FormData, fieldErrors: FieldErrors): SmsAllocationUpsertRequest {
  return {
    providerId: requiredId(formData, "providerId", "Choose the provider.", fieldErrors),
    organizationObjectId: requiredGuid(formData, "organizationObjectId", "Choose the organization.", fieldErrors),
    allocatedSms: smsCount(formData, "allocatedSms", 1, Number.MAX_SAFE_INTEGER, fieldErrors),
    allocationDate: requiredDate(formData, "allocationDate", fieldErrors),
    remarks: optionalText(formData, "remarks", 2000, fieldErrors),
  };
}

/**
 * Allocates (id = null) or changes an allocation. The API refuses more than the provider has left,
 * and a change that would leave the organization below what it already used.
 */
export async function saveAllocationAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = allocationBody(formData, fieldErrors);
  const error = invalid(fieldErrors);
  if (error) return error;

  try {
    await requireModuleAccess(smsModule);
    if (id === null) await smsApi.allocations.create(body);
    else await smsApi.allocations.update(id, body);
  } catch (caught) {
    return toActionError(caught);
  }
  refresh();
  return actionSuccess(id === null ? "SMS allocated." : "Allocation saved.");
}

/** The API refuses (409) an allocation the organization already used. */
export async function deleteAllocationAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(smsModule);
    await smsApi.allocations.remove(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Allocation deleted.");
}
