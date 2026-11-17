"use server";

import { formString, positiveInteger } from "@/core/forms/action-errors";
import { type ActionState } from "@/core/forms/action-state";
import { warrantyApi } from "../api";
import { CLAIM_OUTCOMES, type SupplierClaimReturnRequest, type SupplierClaimUpsertRequest } from "../types";
import { hasErrors, invalid, mutate, oneOf, optionalId, optionalText, readAmount, readDate, requiredText, type FieldErrors } from "./form";

// Server Actions for claims to suppliers (RMA). The API re-checks WARRANTY.M.

/** Sends a unit to the supplier: for a job (serviceJobId; product and serial default to the job's), or stock. */
export async function createClaimAction(serviceJobId: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const supplierId = positiveInteger(formData, "supplierId");
  if (supplierId === null) fieldErrors.supplierId = "Choose the supplier.";
  const productId = optionalId(formData, "productId", fieldErrors);
  if (serviceJobId === null && productId === null) fieldErrors.productId = "Choose the product.";
  const body: SupplierClaimUpsertRequest = {
    serviceJobId,
    supplierId: supplierId ?? 0,
    productId,
    serialNo: optionalText(formData, "serialNo", 100, fieldErrors),
    problemDescription: requiredText(formData, "problemDescription", 2000, fieldErrors),
    sentDate: readDate(formData, "sentDate", fieldErrors),
    supplierReferenceNo: optionalText(formData, "supplierReferenceNo", 100, fieldErrors),
    expectedReturnDate: readDate(formData, "expectedReturnDate", fieldErrors),
    remarks: optionalText(formData, "remarks", 1000, fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.claims.create(body), "Claim recorded.");
}

/** The unit is back from the supplier. */
export async function returnClaimAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const outcome = formString(formData, "outcome");
  if (!oneOf(CLAIM_OUTCOMES, outcome)) fieldErrors.outcome = "Choose what the supplier did.";
  const body: SupplierClaimReturnRequest = {
    returnedDate: readDate(formData, "returnedDate", fieldErrors),
    outcome,
    replacementSerialNo: outcome === "Replaced" ? optionalText(formData, "replacementSerialNo", 100, fieldErrors) : null,
    serviceChargeAmount: readAmount(formData, "serviceChargeAmount", 0, fieldErrors),
    remarks: optionalText(formData, "remarks", 1000, fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.claims.return(id, body), "Claim closed: the unit is back.");
}

export async function cancelClaimAction(id: number): Promise<ActionState> {
  return mutate(() => warrantyApi.claims.cancel(id), "Claim cancelled.");
}
