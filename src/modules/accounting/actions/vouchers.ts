"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
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
  return saveDocument(
    accountingModule,
    async () => {
      const saved = id === null ? await accountingApi.vouchers.create(body, organizationId) : await accountingApi.vouchers.update(id, body);
      if (organizationId) await rememberOrganization(organizationId);
      return saved;
    },
    post ? (savedId) => accountingApi.vouchers.action(savedId, "post", organizationId) : null,
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

/** Flags the draft deleted; it no longer shows anywhere. */
export async function deleteVoucherAction(id: number): Promise<ActionState> {
  return runDocumentAction(accountingModule, () => accountingApi.vouchers.remove(id), "Draft deleted.", "/accounting/vouchers");
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
