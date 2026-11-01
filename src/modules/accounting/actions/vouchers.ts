"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { round } from "@/core/utils/number";
import { accountingApi } from "../api";
import { accountingModule } from "../module";
import { GENERAL_VOUCHER_TYPES, PAYMENT_METHODS, type BillVoucherRequest, type VoucherUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/accounting/vouchers/${id}`,
  edit: (id: number) => `/accounting/vouchers/${id}/edit`,
};
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Creates (id = null) or updates a draft voucher; intent "post" posts it too. */
export async function saveVoucherAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<VoucherUpsertRequest>(formData);
  if (!body || !Array.isArray(body.lines)) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!(GENERAL_VOUCHER_TYPES as readonly string[]).includes(body.voucherType)) return actionError("Choose the voucher type.");
  if (!isDate(body.voucherDate)) return actionError("Enter the voucher date.", { voucherDate: "Required." });
  if (body.lines.length < 2) return actionError("A voucher needs at least two lines: a debit and a credit.");
  for (const [index, line] of body.lines.entries()) {
    const label = `Line ${index + 1}`;
    if (!line.accountId) return actionError(`${label}: choose the ledger head.`);
    if (!isAmount(line.debitAmount) || !isAmount(line.creditAmount) || (line.debitAmount > 0) === (line.creditAmount > 0))
      return actionError(`${label}: enter either a debit or a credit amount.`);
  }

  const post = readIntent(formData) === "post";
  if (post) {
    const debit = round(body.lines.reduce((sum, line) => sum + line.debitAmount, 0), 4);
    const credit = round(body.lines.reduce((sum, line) => sum + line.creditAmount, 0), 4);
    if (debit !== credit)
      return actionError(`Debits (${debit.toFixed(2)}) and credits (${credit.toFixed(2)}) must be equal to post. Save it as a draft instead.`);
  }

  return saveDocument(
    accountingModule,
    () => (id === null ? accountingApi.vouchers.create(body) : accountingApi.vouchers.update(id, body)),
    post ? (savedId) => accountingApi.vouchers.action(savedId, "post") : null,
    paths,
  );
}

export async function postVoucherAction(id: number): Promise<ActionState> {
  return runDocumentAction(accountingModule, () => accountingApi.vouchers.action(id, "post"), "Voucher posted.");
}

/** Takes a posted voucher (a bill payment or collection too) out of the ledgers. */
export async function cancelVoucherAction(id: number): Promise<ActionState> {
  return runDocumentAction(accountingModule, () => accountingApi.vouchers.action(id, "cancel"), "Voucher cancelled.");
}

export async function deleteVoucherAction(id: number): Promise<ActionState> {
  return runDocumentAction(accountingModule, () => accountingApi.vouchers.remove(id), "Draft deleted.", "/accounting/vouchers");
}

function readBill(formData: FormData, party: "supplier" | "customer"): BillVoucherRequest | ActionState {
  const body = readPayload<BillVoucherRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.partyId) return actionError(`Choose the ${party}.`, { partyId: "Required." });
  if (!body.partyAccountId) return actionError("Choose the ledger head.", { partyAccountId: "Required." });
  if (!body.cashAccountId) return actionError("Choose the cash or bank head.", { cashAccountId: "Required." });
  if (!isDate(body.voucherDate)) return actionError("Enter the date.", { voucherDate: "Required." });
  if (!(PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod))
    return actionError("Choose how the money moved.", { paymentMethod: "Required." });
  if (body.paymentMethod === "Cheque" && !isDate(body.chequeDate))
    return actionError("Enter the date on the cheque.", { chequeDate: "Required for a cheque." });
  if (!isAmount(body.amount) || body.amount <= 0) return actionError("Enter the amount (more than 0).", { amount: "Must be more than 0." });
  if (body.paymentMethod !== "Cheque") body.chequeDate = null;
  return body;
}

/** Posts a supplier bill payment (Dr payable, Cr cash/bank) in one step, then opens it. */
export async function createBillPaymentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readBill(formData, "supplier");
  if ("status" in body) return body;
  return saveDocument(accountingModule, () => accountingApi.billPayments.create(body), null, paths);
}

/** Posts a customer bill collection (Dr cash/bank, Cr receivable) in one step, then opens it. */
export async function createBillCollectionAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readBill(formData, "customer");
  if ("status" in body) return body;
  return saveDocument(accountingModule, () => accountingApi.billCollections.create(body), null, paths);
}
