"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, optionalString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { parseDecimal } from "@/core/utils/number";
import { salesApi } from "../api";
import { salesModule } from "../module";
import type { CustomerUpsertRequest } from "../types";

// Save and delete Server Actions for the Customers list. Field limits mirror the API's
// CustomerUpsertRequest so most mistakes are caught before the round trip.

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

function customerBody(formData: FormData, fieldErrors: FieldErrors): CustomerUpsertRequest {
  const email = text(formData, "email", 150, fieldErrors);
  if (email && !fieldErrors.email && !EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address.";

  const countryCode = text(formData, "countryCode", 2, fieldErrors)?.toUpperCase() ?? null;
  if (countryCode && !fieldErrors.countryCode && !/^[A-Z]{2}$/.test(countryCode)) {
    fieldErrors.countryCode = "Use the 2-letter ISO code, e.g. BD.";
  }

  // The form asks for the amount and its side; the API wants + (owed by the customer) or - (advance).
  const openingAmount = decimal(formData, "openingBalance", 0, MAX_AMOUNT, fieldErrors) ?? 0;
  const openingBalance = formString(formData, "openingBalanceSide") === "advance" ? -openingAmount : openingAmount;
  const openingBalanceDate = date(formData, "openingBalanceDate", fieldErrors);

  return {
    // Empty: the next code in the series on create (C-00001, ...); the current one is kept on update.
    code: text(formData, "code", 30, fieldErrors),
    name: requiredText(formData, "name", 250, fieldErrors),
    nameLocal: text(formData, "nameLocal", 250, fieldErrors),
    customerGroupLookupDataId: optionalId(formData, "customerGroupLookupDataId", fieldErrors),
    contactPerson: text(formData, "contactPerson", 150, fieldErrors),
    mobile: text(formData, "mobile", 30, fieldErrors),
    phone: text(formData, "phone", 30, fieldErrors),
    email,
    addressLine1: text(formData, "addressLine1", 250, fieldErrors),
    addressLine2: text(formData, "addressLine2", 250, fieldErrors),
    city: text(formData, "city", 100, fieldErrors),
    state: text(formData, "state", 100, fieldErrors),
    postalCode: text(formData, "postalCode", 20, fieldErrors),
    countryCode,
    nationalIdNo: text(formData, "nationalIdNo", 30, fieldErrors),
    taxRegistrationNo: text(formData, "taxRegistrationNo", 50, fieldErrors),
    paymentTermsDays: integer(formData, "paymentTermsDays", 0, 0, 3650, fieldErrors),
    // Empty = no limit; 0 = cash only.
    creditLimit: decimal(formData, "creditLimit", 0, MAX_AMOUNT, fieldErrors),
    openingBalance,
    // The API drops the date of a zero opening balance anyway.
    openingBalanceDate: openingBalance === 0 ? null : openingBalanceDate,
    remarks: text(formData, "remarks", 1000, fieldErrors),
    isActive: checked(formData, "isActive"),
    isSupplier: checked(formData, "isSupplier"),
  };
}

/** Creates (id = null) or updates a customer. The API answers 409 when the code is taken. */
export async function saveCustomerAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = customerBody(formData, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  try {
    await requireModuleAccess(salesModule);
    if (id === null) await salesApi.customers.create(body);
    else await salesApi.customers.update(id, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(id === null ? "Customer created." : "Customer saved.");
}

/** The API refuses (409) a customer with sales documents: deactivate it instead. */
export async function deleteCustomerAction(id: number): Promise<ActionState> {
  try {
    await requireModuleAccess(salesModule);
    await salesApi.customers.remove(id);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Customer deleted.");
}
