"use server";

import { refresh } from "next/cache";
import { ApiError } from "@/core/api/errors";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { getCurrentOrganization, getMyOrganizations, rememberOrganization } from "@/core/org/organization";
import { round } from "@/core/utils/number";
import { accountingApi } from "../api";
import { accountingModule } from "../module";
import { PAY_TYPES, type BillVoucherRequest, type VoucherUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/accounting/vouchers/${id}`,
  edit: (id: number) => `/accounting/vouchers/${id}/edit`,
};
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const isId = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value > 0;

/** The header fields vouchers and bills share. The API checks the lookups and the cheque rule. */
function checkHeader(body: VoucherUpsertRequest | BillVoucherRequest): ActionState | null {
  if (!isId(body.voucherTypeId)) return actionError("Choose the voucher type.", { voucherTypeId: "Required." });
  if (!isDate(body.voucherDate)) return actionError("Enter the voucher date.", { voucherDate: "Required." });
  if (body.paymentMethodId !== null && !isId(body.paymentMethodId))
    return actionError("Choose the payment method again.", { paymentMethodId: "Not on the list." });
  if (body.chequeDate !== null && !isDate(body.chequeDate)) return actionError("Enter the cheque date.", { chequeDate: "Not a date." });
  if (body.payType !== null && !PAY_TYPES.some((type) => type.value === body.payType))
    return actionError("Choose the pay type: A/C Pay or Cash.", { payType: "Required." });
  return null;
}

/**
 * The organization the editor chose for a new voucher, when it is another of the user's organizations
 * than the one in the header; undefined means the header's.
 */
async function chosenOrganization(formData: FormData): Promise<number | undefined> {
  const id = Number(formData.get("organizationId"));
  if (!Number.isInteger(id) || id <= 0) return undefined;
  const [mine, current] = await Promise.all([getMyOrganizations(), getCurrentOrganization()]);
  if (current?.organizationId === id || !mine.ok || !mine.data.some((organization) => organization.organizationId === id))
    return undefined;
  return id;
}

/** Creates (id = null) or updates a draft voucher; intent "post" posts it too. */
export async function saveVoucherAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<VoucherUpsertRequest>(formData);
  if (!body || !Array.isArray(body.lines)) return actionError("The form couldn't be read. Reload the page and try again.");
  const invalid = checkHeader(body);
  if (invalid) return invalid;
  if (body.lines.length < 2) return actionError("A voucher needs at least two lines: a debit and a credit.");
  for (const [index, line] of body.lines.entries()) {
    const label = `Line ${index + 1}`;
    if (!line.accountId) return actionError(`${label}: choose the ledger head.`);
    if (!isAmount(line.debitAmount) || !isAmount(line.creditAmount) || (line.debitAmount > 0) === (line.creditAmount > 0))
      return actionError(`${label}: enter either a debit or a credit amount.`);
    if (line.localExchangeRate !== null && !(isAmount(line.localExchangeRate) && line.localExchangeRate > 0))
      return actionError(`${label}: the exchange rate must be more than 0.`);
  }

  const post = readIntent(formData) === "post";
  if (post) {
    const debit = round(body.lines.reduce((sum, line) => sum + line.debitAmount, 0), 4);
    const credit = round(body.lines.reduce((sum, line) => sum + line.creditAmount, 0), 4);
    if (debit !== credit)
      return actionError(`Debits (${debit.toFixed(2)}) and credits (${credit.toFixed(2)}) must be equal to post. Save it as a draft instead.`);
  }

  // A new voucher may go to another of the user's organizations (the API checks they may work in it).
  // The header then switches to that organization, where the saved voucher opens. A draft stays put.
  const organizationId = id === null ? await chosenOrganization(formData) : undefined;
  // Saved from a popup: back to the page under it (the list or the voucher), replacing the popup's history entry.
  const returnTo = readReturnTo(formData, /^\/accounting\/vouchers(\/\d+)?$/);
  return saveDocument(
    accountingModule,
    async () => {
      const saved = id === null ? await accountingApi.vouchers.create(body, organizationId) : await accountingApi.vouchers.update(id, body);
      if (organizationId) await rememberOrganization(organizationId);
      return saved;
    },
    post ? (savedId) => accountingApi.vouchers.action(savedId, "post", organizationId) : null,
    returnTo ? { ...paths, view: () => returnTo } : paths,
    "posted",
    returnTo !== null,
  );
}

/** A popup's "returnTo" (the page under it) when it matches `allowed`; anything else is ignored. */
function readReturnTo(formData: FormData, allowed: RegExp): string | null {
  const value = formData.get("returnTo");
  return typeof value === "string" && allowed.test(value) ? value : null;
}

export async function postVoucherAction(id: number): Promise<ActionState> {
  return runDocumentAction(accountingModule, () => accountingApi.vouchers.action(id, "post"), "Voucher posted.");
}

/** Takes a posted voucher out of the ledgers and makes it a draft again (ACCOUNTING.P). */
export async function unpostVoucherAction(id: number): Promise<ActionState> {
  return runDocumentAction(accountingModule, () => accountingApi.vouchers.action(id, "unpost"), "Voucher unposted; it is a draft again.");
}

/** Takes a posted voucher (a bill payment or collection too) out of the ledgers. */
export async function cancelVoucherAction(id: number): Promise<ActionState> {
  return runDocumentAction(accountingModule, () => accountingApi.vouchers.action(id, "cancel"), "Voucher cancelled.");
}

/** Flags the draft deleted; it no longer shows anywhere. From the list it stays there (refreshed) instead of opening it. */
export async function deleteVoucherAction(id: number, stayOnList = false): Promise<ActionState> {
  return runDocumentAction(
    accountingModule,
    () => accountingApi.vouchers.remove(id),
    "Draft deleted.",
    stayOnList ? undefined : "/accounting/vouchers",
  );
}

/** The most vouchers one bulk post or unpost takes (a list page holds fewer). */
const BULK_LIMIT = 100;

/**
 * Posts or unposts the vouchers checked on the list, one by one. Those that fail (e.g. out of balance)
 * are named with the API's reason, one per line, while the others go through.
 */
export async function setVouchersPostedAction(vouchers: { id: number; refNo: string }[], action: "post" | "unpost"): Promise<ActionState> {
  if (action !== "post" && action !== "unpost") return actionError("Choose post or unpost.");
  const chosen = Array.isArray(vouchers) ? vouchers.filter((voucher) => isId(voucher?.id)).slice(0, BULK_LIMIT) : [];
  if (chosen.length === 0) return actionError("Select the vouchers first.");

  try {
    await requireModuleAccess(accountingModule);
  } catch (error) {
    return toActionError(error);
  }
  const failures: string[] = [];
  for (const voucher of chosen) {
    try {
      await accountingApi.vouchers.action(voucher.id, action);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      failures.push(`${String(voucher.refNo).slice(0, 40)}: ${error.message}`);
    }
  }
  refresh();

  const verb = action === "post" ? "Posted" : "Unposted";
  const done = chosen.length - failures.length;
  if (failures.length === 0) return actionSuccess(`${verb} ${done} voucher(s).`);
  return actionError([`${verb} ${done} of ${chosen.length} voucher(s). Not ${verb.toLowerCase()}:`, ...failures].join("\n"));
}

function readBill(formData: FormData, party: "supplier" | "customer"): BillVoucherRequest | ActionState {
  const body = readPayload<BillVoucherRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.partyId) return actionError(`Choose the ${party}.`, { partyId: "Required." });
  if (!body.partyAccountId) return actionError("Choose the ledger head.", { partyAccountId: "Required." });
  if (!body.cashAccountId) return actionError("Choose the cash or bank head.", { cashAccountId: "Required." });
  const invalid = checkHeader(body);
  if (invalid) return invalid;
  if (!isAmount(body.amount) || body.amount <= 0) return actionError("Enter the amount (more than 0).", { amount: "Must be more than 0." });
  return body;
}

/** Saved from the popup over its list: back to the list (replacing the popup's history entry); else opens the voucher. */
function saveBill(create: () => Promise<{ id: number }>, formData: FormData, list: "/accounting/bill-payments" | "/accounting/bill-collections") {
  const returnTo = readReturnTo(formData, new RegExp(`^${list}$`));
  return saveDocument(accountingModule, create, null, returnTo ? { ...paths, view: () => returnTo } : paths, "posted", returnTo !== null);
}

/** Posts a supplier bill payment (Dr payable, Cr cash/bank) in one step, then opens it. */
export async function createBillPaymentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readBill(formData, "supplier");
  if ("status" in body) return body;
  return saveBill(() => accountingApi.billPayments.create(body), formData, "/accounting/bill-payments");
}

/** Posts a customer bill collection (Dr cash/bank, Cr receivable) in one step, then opens it. */
export async function createBillCollectionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readBill(formData, "customer");
  if ("status" in body) return body;
  return saveBill(() => accountingApi.billCollections.create(body), formData, "/accounting/bill-collections");
}
