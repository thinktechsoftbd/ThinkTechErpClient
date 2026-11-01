"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionSuccess, type ActionState } from "@/core/forms/action-state";
import { smsApi } from "../api";
import { smsModule } from "../module";
import type { SmsPurchaseUpsertRequest } from "../types";
import { decimal, invalid, optionalText, requiredDate, requiredId, smsCount, type FieldErrors } from "./form-input";

// Save and delete Server Actions for SMS bought from providers.

function purchaseBody(formData: FormData, fieldErrors: FieldErrors): SmsPurchaseUpsertRequest {
  return {
    providerId: requiredId(formData, "providerId", "Choose the provider.", fieldErrors),
    purchaseDate: requiredDate(formData, "purchaseDate", fieldErrors),
    invoiceNumber: optionalText(formData, "invoiceNumber", 100, fieldErrors),
    referenceNumber: optionalText(formData, "referenceNumber", 150, fieldErrors),
    smsQuantity: smsCount(formData, "smsQuantity", 1, Number.MAX_SAFE_INTEGER, fieldErrors),
    currencyId: requiredId(formData, "currencyId", "Choose the currency.", fieldErrors),
    unitPrice: decimal(formData, "unitPrice", { min: 0, max: 999_999_999, required: true }, fieldErrors) ?? 0,
    // Empty: quantity × unit price, worked out by the API.
    totalAmount: decimal(formData, "totalAmount", { min: 0, max: 999_999_999_999 }, fieldErrors),
    // The form sends 1 for BDT, which the API forces anyway.
    localExchangeRate:
      decimal(formData, "localExchangeRate", { min: 0.000001, max: 999_999_999, required: true }, fieldErrors) ?? 1,
    remarks: optionalText(formData, "remarks", 2000, fieldErrors),
  };
}

/** Records (id = null) or corrects a purchase. Fewer SMS must still cover what was allocated. */
export async function savePurchaseAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = purchaseBody(formData, fieldErrors);
  const error = invalid(fieldErrors);
  if (error) return error;

  try {
    await requireModuleAccess(smsModule);
    if (id === null) await smsApi.purchases.create(body);
    else await smsApi.purchases.update(id, body);
  } catch (caught) {
    return toActionError(caught);
  }
  refresh();
  return actionSuccess(id === null ? "Purchase recorded." : "Purchase saved.");
}

/** The API refuses (409) a purchase whose SMS are already allocated. */
export async function deletePurchaseAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(smsModule);
    await smsApi.purchases.remove(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Purchase deleted.");
}
