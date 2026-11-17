"use server";

import { positiveInteger } from "@/core/forms/action-errors";
import { type ActionState } from "@/core/forms/action-state";
import { parseDecimal } from "@/core/utils/number";
import { warrantyApi } from "../api";
import type { WarrantyCardCreateRequest } from "../types";
import { hasErrors, invalid, mutate, optionalId, optionalText, readDate, requiredText, type FieldErrors } from "./form";

// Server Actions for warranty cards: manual cards (units sold before go-live) and voiding. The API re-checks WARRANTY.M.

export async function createCardAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const productId = positiveInteger(formData, "productId");
  if (productId === null) fieldErrors.productId = "Choose the product.";
  const quantity = parseDecimal(String(formData.get("quantity") ?? "1")) ?? 0;
  if (quantity <= 0) fieldErrors.quantity = "Enter how many units.";
  const customerId = optionalId(formData, "customerId", fieldErrors);
  const customerName = optionalText(formData, "customerName", 250, fieldErrors);
  const customerMobile = optionalText(formData, "customerMobile", 30, fieldErrors);
  if (customerId === null && !customerName && !customerMobile) fieldErrors.customerMobile = "Pick the customer, or enter a name or mobile.";
  const body: WarrantyCardCreateRequest = {
    productId: productId ?? 0,
    serialNo: optionalText(formData, "serialNo", 100, fieldErrors),
    quantity,
    customerId,
    customerName: customerId === null ? customerName : null,
    customerMobile,
    warrantyPolicyId: optionalId(formData, "warrantyPolicyId", fieldErrors),
    startDate: readDate(formData, "startDate", fieldErrors, true) ?? "",
    endDate: readDate(formData, "endDate", fieldErrors),
    remarks: optionalText(formData, "remarks", 1000, fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.cards.create(body), "Warranty card registered.");
}

export async function voidCardAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const reason = requiredText(formData, "reason", 500, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.cards.void(id, reason), "Warranty card voided.");
}
