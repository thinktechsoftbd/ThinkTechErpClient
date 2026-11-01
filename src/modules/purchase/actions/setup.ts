"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, optionalString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { parseDecimal } from "@/core/utils/number";
import { purchaseApi } from "../api";
import { purchaseModule } from "../module";
import { TAX_TYPES, type SupplierUpsertRequest, type TaxGroupUpsertRequest, type TaxRateUpsertRequest } from "../types";

// Save and delete Server Actions for the Purchase setup lists (suppliers, tax rates, tax groups).
// Field limits mirror the API's request models so most mistakes are caught before the round trip.

type FieldErrors = Record<string, string>;

const MAX_AMOUNT = 999_999_999_999;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hasErrors(fieldErrors: FieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

function invalid(fieldErrors: FieldErrors) {
  return actionError("Please correct the highlighted fields.", fieldErrors);
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

/** Required text field limited to `max` characters. */
function requiredText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (!value) fieldErrors[name] = "Required.";
  else if (value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

/** Optional text field limited to `max` characters; empty gives null. */
function text(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = optionalString(formData, name);
  if (value && value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

/** Optional lookup id from a select; empty gives null. */
function optionalId(formData: FormData, name: string, fieldErrors: FieldErrors) {
  const raw = formString(formData, name);
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    fieldErrors[name] = "Choose a value from the list.";
    return null;
  }
  return id;
}

/** Whole number in [min, max]; empty gives `fallback`. */
function integer(formData: FormData, name: string, fallback: number, min: number, max: number, fieldErrors: FieldErrors) {
  const raw = formString(formData, name).replace(/,/g, "");
  if (!raw) return fallback;
  const value = Number(raw);
  if (!/^-?\d+$/.test(raw) || value < min || value > max) {
    fieldErrors[name] = `Enter a whole number from ${min} to ${max.toLocaleString("en-US")}.`;
    return fallback;
  }
  return value;
}

/** Decimal in [min, max]; empty gives null. */
function decimal(formData: FormData, name: string, min: number, max: number, fieldErrors: FieldErrors) {
  const raw = formString(formData, name);
  if (!raw) return null;
  const value = parseDecimal(raw);
  if (value === null || value < min || value > max) {
    fieldErrors[name] = `Enter a number from ${min.toLocaleString("en-US")} to ${max.toLocaleString("en-US")}.`;
    return null;
  }
  return value;
}

/** Optional calendar date (YYYY-MM-DD). */
function date(formData: FormData, name: string, fieldErrors: FieldErrors) {
  const value = optionalString(formData, name);
  if (value && !DATE_PATTERN.test(value)) fieldErrors[name] = "Choose a valid date, or leave it empty.";
  return value;
}

// ---- Suppliers

function supplierBody(formData: FormData, fieldErrors: FieldErrors): SupplierUpsertRequest {
  const email = text(formData, "email", 150, fieldErrors);
  if (email && !fieldErrors.email && !EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address.";

  const countryCode = text(formData, "countryCode", 2, fieldErrors)?.toUpperCase() ?? null;
  if (countryCode && !fieldErrors.countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    fieldErrors.countryCode = "Use the 2-letter ISO code, e.g. BD.";
  }

  // The form asks for the amount and its side; the API wants + (owed to the supplier) or - (advance).
  const openingAmount = decimal(formData, "openingBalance", 0, MAX_AMOUNT, fieldErrors) ?? 0;
  const openingBalance = formString(formData, "openingBalanceSide") === "advance" ? -openingAmount : openingAmount;
  const openingBalanceDate = date(formData, "openingBalanceDate", fieldErrors);

  return {
    code: requiredText(formData, "code", 30, fieldErrors),
    name: requiredText(formData, "name", 250, fieldErrors),
    nameLocal: text(formData, "nameLocal", 250, fieldErrors),
    supplierGroupLookupDataId: optionalId(formData, "supplierGroupLookupDataId", fieldErrors),
    contactPerson: text(formData, "contactPerson", 150, fieldErrors),
    phone: text(formData, "phone", 30, fieldErrors),
    mobile: text(formData, "mobile", 30, fieldErrors),
    email,
    addressLine1: text(formData, "addressLine1", 250, fieldErrors),
    addressLine2: text(formData, "addressLine2", 250, fieldErrors),
    city: text(formData, "city", 100, fieldErrors),
    state: text(formData, "state", 100, fieldErrors),
    postalCode: text(formData, "postalCode", 20, fieldErrors),
    countryCode,
    taxRegistrationNo: text(formData, "taxRegistrationNo", 50, fieldErrors),
    taxIdNo: text(formData, "taxIdNo", 50, fieldErrors),
    tradeLicenseNo: text(formData, "tradeLicenseNo", 50, fieldErrors),
    regulatoryLicenseNo: text(formData, "regulatoryLicenseNo", 100, fieldErrors),
    currencyLookupDataId: optionalId(formData, "currencyLookupDataId", fieldErrors),
    paymentTermsDays: integer(formData, "paymentTermsDays", 0, 0, 3650, fieldErrors),
    creditLimit: decimal(formData, "creditLimit", 0, MAX_AMOUNT, fieldErrors),
    openingBalance,
    // The API drops the date of a zero opening balance anyway.
    openingBalanceDate: openingBalance === 0 ? null : openingBalanceDate,
    bankName: text(formData, "bankName", 150, fieldErrors),
    bankBranch: text(formData, "bankBranch", 150, fieldErrors),
    bankAccountName: text(formData, "bankAccountName", 150, fieldErrors),
    bankAccountNo: text(formData, "bankAccountNo", 50, fieldErrors),
    bankRoutingCode: text(formData, "bankRoutingCode", 30, fieldErrors),
    mobileWalletNo: text(formData, "mobileWalletNo", 30, fieldErrors),
    remarks: text(formData, "remarks", 1000, fieldErrors),
    isActive: checked(formData, "isActive"),
    isCustomer: checked(formData, "isCustomer"),
  };
}

/** Creates (id = null) or updates a supplier. The API answers 409 when the code is taken. */
export async function saveSupplierAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = supplierBody(formData, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(purchaseModule);
    if (id === null) await purchaseApi.suppliers.create(body);
    else await purchaseApi.suppliers.update(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Supplier created." : "Supplier saved.");
}

export async function deleteSupplierAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(purchaseModule);
    await purchaseApi.suppliers.remove(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Supplier deleted.");
}

// ---- Tax rates

/** Creates (id = null) or updates a tax rate. */
export async function saveTaxRateAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const taxType = formString(formData, "taxType");
  if (!(TAX_TYPES as readonly string[]).includes(taxType)) fieldErrors.taxType = "Choose a tax type.";
  const ratePercent = decimal(formData, "ratePercent", 0, 1000, fieldErrors);
  if (ratePercent === null && !fieldErrors.ratePercent) fieldErrors.ratePercent = "Required.";

  const body: TaxRateUpsertRequest = {
    code: requiredText(formData, "code", 30, fieldErrors),
    name: requiredText(formData, "name", 150, fieldErrors),
    taxType,
    ratePercent: ratePercent ?? 0,
    isRecoverable: checked(formData, "isRecoverable"),
    isActive: checked(formData, "isActive"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(purchaseModule);
    if (id === null) await purchaseApi.taxRates.create(body);
    else await purchaseApi.taxRates.update(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Tax rate created." : "Tax rate saved.");
}

export async function deleteTaxRateAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(purchaseModule);
    await purchaseApi.taxRates.remove(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Tax rate deleted.");
}

// ---- Tax groups

/**
 * The rates editor posts its rows as JSON in the hidden "rates" field, in order. The first rate
 * can't be compound (there is no tax before it), so its flag is dropped.
 */
function readRates(formData: FormData, fieldErrors: FieldErrors): TaxGroupUpsertRequest["rates"] {
  const raw = formData.get("rates");
  if (typeof raw !== "string" || !raw.trim()) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!Array.isArray(parsed)) {
    fieldErrors.rates = "The rates couldn't be read. Reload the page and try again.";
    return [];
  }

  const rates: TaxGroupUpsertRequest["rates"] = [];
  for (const item of parsed as { taxRateId?: unknown; isCompound?: unknown }[]) {
    const taxRateId = Number(item?.taxRateId);
    if (!Number.isSafeInteger(taxRateId) || taxRateId <= 0) {
      fieldErrors.rates = "One of the rates is not valid. Remove it and add it again.";
      continue;
    }
    if (rates.some((rate) => rate.taxRateId === taxRateId)) {
      fieldErrors.rates = "A tax rate is listed twice.";
      continue;
    }
    rates.push({ taxRateId, isCompound: rates.length > 0 && item.isCompound === true });
  }
  return rates;
}

/** Creates (id = null) or updates a tax group; no rates makes an exempt group. */
export async function saveTaxGroupAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body: TaxGroupUpsertRequest = {
    name: requiredText(formData, "name", 150, fieldErrors),
    isActive: checked(formData, "isActive"),
    rates: readRates(formData, fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(purchaseModule);
    if (id === null) await purchaseApi.taxGroups.create(body);
    else await purchaseApi.taxGroups.update(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Tax group created." : "Tax group saved.");
}

export async function deleteTaxGroupAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(purchaseModule);
    await purchaseApi.taxGroups.remove(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Tax group deleted.");
}
