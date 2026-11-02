import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { accountingApi } from "./api";
import type { PartyType } from "./types";

/** How many ledger heads (sub classes) the chart has; the pickers search them as the user types. */
export const getLedgerHeadCount = cache(() =>
  tryApi(async () => (await accountingApi.ledgerHeadSearch({ limit: 1 })).totalCount),
);

/** One ledger head by id, for a picker's starting value; null when it no longer exists. */
export const getLedgerHead = cache((id: number) =>
  tryApi(async () => (await accountingApi.ledgerHeads({ ids: String(id), limit: 1 }))[0] ?? null),
);

/** Suppliers, customers, or both (no type), for the voucher and report pickers (active first). */
export const getParties = cache((type?: PartyType) => tryApi(() => accountingApi.parties(type, { limit: 500 })));

/** The "Voucher Type" and "Payment Method" lookup lists, inactive values included. */
export const getVoucherTypes = cache(() => tryApi(() => accountingApi.vouchers.types()));
export const getPaymentMethods = cache(() => tryApi(() => accountingApi.vouchers.paymentMethods()));
