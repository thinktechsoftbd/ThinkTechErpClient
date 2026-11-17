"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { warrantyApi } from "../api";
import type { WarrantyPolicyUpsertRequest } from "../types";
import { checked, hasErrors, invalid, mutate, optionalText, readWhole, requiredText, type FieldErrors } from "./form";

// Server Actions for Warranty -> Settings (policies and the products sold with them). The API re-checks WARRANTY.M.

/** Creates (id = null) or updates a warranty policy. */
export async function savePolicyAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body: WarrantyPolicyUpsertRequest = {
    name: requiredText(formData, "name", 150, fieldErrors),
    warrantyMonths: readWhole(formData, "warrantyMonths", { min: 1, max: 600 }, 0, fieldErrors),
    replacementDays: readWhole(formData, "replacementDays", { min: 0, max: 18_600 }, 0, fieldErrors),
    coversParts: checked(formData, "coversParts"),
    coversLabor: checked(formData, "coversLabor"),
    terms: optionalText(formData, "terms", 2000, fieldErrors),
    isActive: checked(formData, "isActive"),
  };
  if (!fieldErrors.warrantyMonths && body.warrantyMonths < 1) fieldErrors.warrantyMonths = "Required.";
  if (!fieldErrors.replacementDays && body.replacementDays > body.warrantyMonths * 31)
    fieldErrors.replacementDays = "Can't be longer than the warranty.";
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  return mutate(
    () => (id === null ? warrantyApi.policies.create(body) : warrantyApi.policies.update(id, body)),
    id === null ? "Policy created." : "Policy saved.",
  );
}

export async function deletePolicyAction(id: number): Promise<ActionState> {
  return mutate(() => warrantyApi.policies.remove(id), "Policy deleted.");
}

/** Sets the policy of the chosen products (null takes the warranty off). */
export async function assignProductPolicyAction(productIds: number[], policyId: number | null): Promise<ActionState> {
  const ids = [...new Set(productIds.filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 500);
  if (ids.length === 0) return actionError("Choose at least one product.");
  if (policyId !== null && !(Number.isSafeInteger(policyId) && policyId > 0)) return actionError("Choose a policy.");
  return mutate(
    () => warrantyApi.products.assign(ids, policyId),
    policyId === null ? `Warranty taken off ${ids.length} product(s).` : `Policy set on ${ids.length} product(s).`,
  );
}
