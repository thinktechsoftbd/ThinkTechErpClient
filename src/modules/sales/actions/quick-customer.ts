"use server";

import { ApiError } from "@/core/api/errors";
import { requireModuleAccess } from "@/core/auth/guards";
import { salesApi } from "../api";
import { salesModule } from "../module";
import type { CustomerOption } from "../types";

export type QuickCustomerResult = { ok: true; customer: CustomerOption } | { ok: false; error: string };

/**
 * Adds a customer from the sales screen with just a name and mobile (the code is the next in the
 * series; terms and credit limit can be set later on the Customers page).
 */
export async function addQuickCustomerAction(input: { name: string; mobile: string }): Promise<QuickCustomerResult> {
  const name = input.name.trim();
  const mobile = input.mobile.trim();
  if (!name) return { ok: false, error: "Enter the customer's name." };
  if (name.length > 250 || mobile.length > 30) return { ok: false, error: "The name or mobile is too long." };

  try {
    await requireModuleAccess(salesModule);
    const customer = await salesApi.customers.create({
      code: null,
      name,
      nameLocal: null,
      customerGroupLookupDataId: null,
      contactPerson: null,
      mobile: mobile || null,
      phone: null,
      email: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      countryCode: null,
      nationalIdNo: null,
      taxRegistrationNo: null,
      paymentTermsDays: 0,
      creditLimit: null,
      openingBalance: 0,
      openingBalanceDate: null,
      remarks: null,
      isActive: true,
    });
    return {
      ok: true,
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        mobile: customer.mobile,
        address: null,
        paymentTermsDays: customer.paymentTermsDays,
        creditLimit: customer.creditLimit,
        balance: customer.balance,
        availableCredit: customer.creditLimit === null ? null : customer.creditLimit - customer.balance,
        isActive: customer.isActive,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error: error.message };
    throw error;
  }
}
