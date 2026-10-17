"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, optionalString, positiveInteger, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { smsApi } from "./api";
import { smsModule } from "./module";

const CLIENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export async function createClientAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const clientId = formString(formData, "clientId");
  const displayName = formString(formData, "displayName");

  const fieldErrors: Record<string, string> = {};
  if (!CLIENT_ID_PATTERN.test(clientId)) {
    fieldErrors.clientId = "Use 1–128 letters, numbers, dots, dashes, colons or underscores.";
  }
  if (!displayName || displayName.length > 200) fieldErrors.displayName = "Enter a display name (max 200 characters).";
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  try {
    await requireModuleAccess(smsModule);
    await smsApi.createClient({ clientId, displayName });
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/sms/clients/${encodeURIComponent(clientId)}`);
}

export async function updateClientAction(
  clientId: string,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const displayName = formString(formData, "displayName");
  const isActive = formData.get("isActive") === "on";
  if (!displayName || displayName.length > 200) {
    return actionError("Please correct the highlighted fields.", {
      displayName: "Enter a display name (max 200 characters).",
    });
  }

  try {
    await requireModuleAccess(smsModule);
    await smsApi.updateClient(clientId, { displayName, isActive });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Client updated.");
}

export async function allocateAction(clientId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const smsQuantity = positiveInteger(formData, "smsQuantity");
  const note = optionalString(formData, "note");
  if (!smsQuantity) {
    return actionError("Please correct the highlighted fields.", { smsQuantity: "Enter a whole number greater than 0." });
  }
  if (note && note.length > 500) return actionError("Please correct the highlighted fields.", { note: "Max 500 characters." });

  try {
    await requireModuleAccess(smsModule);
    await smsApi.allocate(clientId, { smsQuantity, note });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(`Allocated ${smsQuantity.toLocaleString("en-US")} SMS.`);
}

export async function recordPurchaseAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const smsQuantity = positiveInteger(formData, "smsQuantity");
  const providerReference = optionalString(formData, "providerReference");
  const amountRaw = formString(formData, "amountPaid").replace(/,/g, "");
  const currency = optionalString(formData, "currency")?.toUpperCase() ?? null;
  const note = optionalString(formData, "note");

  const fieldErrors: Record<string, string> = {};
  if (!smsQuantity) fieldErrors.smsQuantity = "Enter a whole number greater than 0.";
  let amountPaid: number | null = null;
  if (amountRaw) {
    amountPaid = Number(amountRaw);
    if (!/^\d+(\.\d{1,2})?$/.test(amountRaw) || amountPaid > 999_999_999_999.99) {
      fieldErrors.amountPaid = "Enter an amount with up to 2 decimals.";
    }
  }
  if (currency && !/^[A-Z]{3}$/.test(currency)) fieldErrors.currency = "Use a 3-letter ISO code, e.g. BDT or USD.";
  if (providerReference && providerReference.length > 128) fieldErrors.providerReference = "Max 128 characters.";
  if (note && note.length > 500) fieldErrors.note = "Max 500 characters.";
  if (Object.keys(fieldErrors).length > 0 || !smsQuantity) {
    return actionError("Please correct the highlighted fields.", fieldErrors);
  }

  try {
    await requireModuleAccess(smsModule);
    await smsApi.recordPurchase({ smsQuantity, providerReference, amountPaid, currency, note });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(`Recorded a purchase of ${smsQuantity.toLocaleString("en-US")} SMS.`);
}
