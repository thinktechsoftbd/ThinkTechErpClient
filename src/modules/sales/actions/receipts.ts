"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readPayload } from "@/core/documents/payload";
import { popupReturn, runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { round } from "@/core/utils/number";
import { salesApi } from "../api";
import { salesModule } from "../module";
import { RECEIPT_METHODS, type CustomerReceiptCreateRequest } from "../types";

const view = (id: number) => `/sales/receipts/${id}`;
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Records and posts a customer receipt (or a refund to the customer) in one step, then opens it. */
export async function createReceiptAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<CustomerReceiptCreateRequest>(formData);
  if (!body || !Array.isArray(body.allocations)) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.customerId) return actionError("Choose the customer.", { customerId: "Required." });
  if (body.receiptType !== "Receipt" && body.receiptType !== "Refund") return actionError("Choose a receipt or a refund.");
  if (!(RECEIPT_METHODS as readonly string[]).includes(body.paymentMethod))
    return actionError("Choose how the money was received.", { paymentMethod: "Required." });
  if (!body.receiptDate) return actionError("Enter the receipt date.", { receiptDate: "Required." });
  if (body.paymentMethod === "Cheque" && !body.chequeDate)
    return actionError("Enter the date on the cheque.", { chequeDate: "Required for a cheque." });
  if (!isAmount(body.amount) || body.amount <= 0)
    return actionError("Enter the amount (more than 0).", { amount: "Must be more than 0." });
  if (!isAmount(body.taxDeductedAmount) || body.taxDeductedAmount < 0)
    return actionError("The tax deducted can't be negative.", { taxDeductedAmount: "Enter a valid amount." });

  if (body.receiptType === "Refund") {
    body.allocations = [];
    body.autoAllocate = false;
    body.taxDeductedAmount = 0;
  } else {
    const settles = round(body.amount + body.taxDeductedAmount, 2);
    const ids = new Set<number>();
    for (const allocation of body.allocations) {
      if (!allocation.salesInvoiceId || !isAmount(allocation.amount) || allocation.amount <= 0)
        return actionError("Every allocated amount must be more than 0.");
      if (ids.has(allocation.salesInvoiceId)) return actionError("An invoice is allocated twice.");
      ids.add(allocation.salesInvoiceId);
    }
    const allocated = round(body.allocations.reduce((sum, a) => sum + a.amount, 0), 2);
    if (allocated > settles)
      return actionError(
        `The allocations (${allocated.toFixed(2)}) are more than the receipt plus the tax deducted (${settles.toFixed(2)}).`,
      );
    if (body.allocations.length > 0) body.autoAllocate = false;
  }

  const target = popupReturn(formData, "/sales/receipts", { view, edit: view });
  return saveDocument(salesModule, () => salesApi.receipts.create(body), null, target.paths, "posted", target.replace);
}

/** Takes the receipt off its invoices (they are due again). */
export async function cancelReceiptAction(id: number): Promise<ActionState> {
  return runDocumentAction(salesModule, () => salesApi.receipts.cancel(id), "Receipt cancelled.");
}

/** A pending cheque cleared, or bounced (which takes it off its invoices). */
export async function setReceiptChequeStatusAction(id: number, chequeStatus: "Cleared" | "Bounced"): Promise<ActionState> {
  if (chequeStatus !== "Cleared" && chequeStatus !== "Bounced") return actionError("Unknown cheque status.");
  return runDocumentAction(
    salesModule,
    () => salesApi.receipts.setChequeStatus(id, chequeStatus),
    chequeStatus === "Cleared" ? "Cheque marked cleared." : "Cheque marked bounced.",
  );
}
