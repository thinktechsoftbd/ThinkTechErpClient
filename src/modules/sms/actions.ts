"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, optionalString, positiveInteger, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { smsApi } from "./api";
import { smsModule } from "./module";

export async function getNextClientIdAction(): Promise<string> {
  await requireModuleAccess(smsModule);
  const clients = await smsApi.getClients(25, 0);
  const nextNumber = clients.reduce((max, client) => {
    const match = /^clt-(\d+)$/i.exec(client.clientId);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0) + 1;
  return `clt-${String(nextNumber).padStart(4, "0")}`;
}

export async function createClientAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const clientId = formString(formData, "clientId");
  const displayName = formString(formData, "displayName");

  const fieldErrors: Record<string, string> = {};
  if (!/^clt-\d{4,}$/.test(clientId)) {
    fieldErrors.clientId = "The generated client ID is invalid. Please reopen the form to generate a new one.";
  }
  if (!displayName || displayName.length > 200) fieldErrors.displayName = "Enter a display name (max 200 characters).";
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  try {
    await requireModuleAccess(smsModule);
    await smsApi.createClient({ clientId, displayName });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(`Created client ${clientId}.`);
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

export async function deleteClientAction(clientId: string): Promise<ActionState> {
  try {
    await requireModuleAccess(smsModule);
    await smsApi.deleteClient(clientId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(`Deactivated client ${clientId}.`);
}

export async function allocateAction(clientId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const smsQuantity = positiveInteger(formData, "smsQuantity");
  const note = optionalString(formData, "note");
  const isFinalized = formData.get("isFinalized") === "on";
  if (!smsQuantity) {
    return actionError("Please correct the highlighted fields.", { smsQuantity: "Enter a whole number greater than 0." });
  }
  if (note && note.length > 500) return actionError("Please correct the highlighted fields.", { note: "Max 500 characters." });

  try {
    await requireModuleAccess(smsModule);
    await smsApi.allocate(clientId, { smsQuantity, note, isFinalized });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(`Allocated ${smsQuantity.toLocaleString("en-US")} SMS.`);
}

export async function updateAllocationAction(
  allocationId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const note = optionalString(formData, "note");
  if (note && note.length > 500) {
    return actionError("Please correct the highlighted fields.", { note: "Max 500 characters." });
  }
  try {
    await requireModuleAccess(smsModule);
    await smsApi.updateAllocation(allocationId, { note });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Allocation updated.");
}

export async function finalizeAllocationAction(allocationId: number): Promise<ActionState> {
  try {
    await requireModuleAccess(smsModule);
    await smsApi.finalizeAllocation(allocationId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Allocation finalized.");
}

/** Allocation form on the Allocations page, where the client is picked in the form. */
export async function allocateToClientAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const clientId = formString(formData, "clientId");
  if (!clientId) return actionError("Please correct the highlighted fields.", { clientId: "Choose a client." });
  return allocateAction(clientId, _previous, formData);
}

export async function recordUsageAction(clientId: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const smsQuantity = positiveInteger(formData, "smsQuantity");
  const requestReference = formString(formData, "requestReference");
  const recipient = optionalString(formData, "recipient");
  const providerMessageId = optionalString(formData, "providerMessageId");

  const fieldErrors: Record<string, string> = {};
  if (!smsQuantity) fieldErrors.smsQuantity = "Enter a whole number greater than 0.";
  if (!requestReference || requestReference.length > 128) {
    fieldErrors.requestReference = "Enter a unique reference (max 128 characters).";
  }
  if (recipient && recipient.length > 32) fieldErrors.recipient = "Max 32 characters.";
  if (providerMessageId && providerMessageId.length > 128) fieldErrors.providerMessageId = "Max 128 characters.";
  if (Object.keys(fieldErrors).length > 0 || !smsQuantity) {
    return actionError("Please correct the highlighted fields.", fieldErrors);
  }

  try {
    await requireModuleAccess(smsModule);
    await smsApi.recordUsage(clientId, { smsQuantity, requestReference, recipient, providerMessageId });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(`Recorded ${smsQuantity.toLocaleString("en-US")} SMS sent for ${clientId}.`);
}

export async function recordPurchaseAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const smsQuantity = positiveInteger(formData, "smsQuantity");
  const providerReference = optionalString(formData, "providerReference");
  const amountRaw = formString(formData, "amountPaid").replace(/,/g, "");
  const currency = formString(formData, "currency").toUpperCase();
  const exchangeRateRaw = formString(formData, "exchangeRate").replace(/,/g, "");
  const note = optionalString(formData, "note");

  const fieldErrors: Record<string, string> = {};
  if (!smsQuantity) fieldErrors.smsQuantity = "Enter a whole number greater than 0.";
  if (!providerReference) fieldErrors.providerReference = "Enter the provider reference.";
  else if (providerReference.length > 128) fieldErrors.providerReference = "Max 128 characters.";
  let amountPaid: number | null = null;
  if (!amountRaw) {
    fieldErrors.amountPaid = "Enter the amount paid.";
  } else {
    amountPaid = Number(amountRaw);
    if (!/^\d+(\.\d{1,2})?$/.test(amountRaw) || amountPaid > 999_999_999_999.99) {
      fieldErrors.amountPaid = "Enter an amount with up to 2 decimals.";
    }
  }
  let exchangeRate: number | null = null;
  if (currency === "USD" && !exchangeRateRaw) {
    fieldErrors.exchangeRate = "Enter the USD to BDT exchange rate.";
  } else if (exchangeRateRaw) {
    exchangeRate = Number(exchangeRateRaw);
    if (!/^\d+(\.\d{1,6})?$/.test(exchangeRateRaw) || exchangeRate <= 0 || exchangeRate > 999_999_999_999.999999) {
      fieldErrors.exchangeRate = "Enter a positive exchange rate with up to 6 decimals.";
    }
  }
  if (currency !== "BDT" && currency !== "USD") fieldErrors.currency = "Choose BDT or USD.";
  if (note && note.length > 500) fieldErrors.note = "Max 500 characters.";
  if (Object.keys(fieldErrors).length > 0 || !smsQuantity) {
    return actionError("Please correct the highlighted fields.", fieldErrors);
  }

  try {
    await requireModuleAccess(smsModule);
    await smsApi.recordPurchase({ smsQuantity, providerReference, amountPaid, currency, exchangeRate, note });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(`Recorded a purchase of ${smsQuantity.toLocaleString("en-US")} SMS.`);
}

export async function updatePurchaseAction(
  purchaseId: number,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const providerReference = formString(formData, "providerReference").trim();
  const amountRaw = formString(formData, "amountPaid").replace(/,/g, "");
  const currency = formString(formData, "currency").toUpperCase();
  const exchangeRateRaw = formString(formData, "exchangeRate").replace(/,/g, "");
  const note = optionalString(formData, "note");

  const fieldErrors: Record<string, string> = {};
  if (!providerReference) fieldErrors.providerReference = "Enter the provider.";
  else if (providerReference.length > 128) fieldErrors.providerReference = "Max 128 characters.";
  let amountPaid: number | null = null;
  if (!amountRaw) fieldErrors.amountPaid = "Enter the amount paid.";
  else {
    amountPaid = Number(amountRaw);
    if (!/^\d+(\.\d{1,2})?$/.test(amountRaw) || amountPaid > 999_999_999_999.99) {
      fieldErrors.amountPaid = "Enter an amount with up to 2 decimals.";
    }
  }
  let exchangeRate: number | null = null;
  if (currency === "USD" && !exchangeRateRaw) fieldErrors.exchangeRate = "Enter the USD to BDT exchange rate.";
  else if (exchangeRateRaw) {
    exchangeRate = Number(exchangeRateRaw);
    if (!/^\d+(\.\d{1,6})?$/.test(exchangeRateRaw) || exchangeRate <= 0 || exchangeRate > 999_999_999_999.999999) {
      fieldErrors.exchangeRate = "Enter a positive exchange rate with up to 6 decimals.";
    }
  }
  if (currency !== "BDT" && currency !== "USD") fieldErrors.currency = "Choose BDT or USD.";
  if (note && note.length > 500) fieldErrors.note = "Max 500 characters.";
  if (Object.keys(fieldErrors).length > 0 || amountPaid === null) {
    return actionError("Please correct the highlighted fields.", fieldErrors);
  }
  const validCurrency: "BDT" | "USD" = currency === "USD" ? "USD" : "BDT";

  try {
    await requireModuleAccess(smsModule);
    await smsApi.updatePurchase(purchaseId, { providerReference, amountPaid, currency: validCurrency, exchangeRate, note });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Purchase updated.");
}
