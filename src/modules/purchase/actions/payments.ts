"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { round } from "@/core/utils/number";
import { purchaseApi } from "../api";
import { purchaseModule } from "../module";
import { PAYMENT_METHODS, type SupplierPaymentCreateRequest } from "../types";

const view = (id: number) => `/purchase/payments/${id}`;
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Records and posts a supplier payment (or refund) in one step, then opens it. */
export async function createPaymentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<SupplierPaymentCreateRequest>(formData);
  if (!body || !Array.isArray(body.allocations)) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.supplierId) return actionError("Choose the supplier.", { supplierId: "Required." });
  if (body.paymentType !== "Payment" && body.paymentType !== "Refund") return actionError("Choose a payment or a refund.");
  if (!(PAYMENT_METHODS as readonly string[]).includes(body.paymentMethod))
    return actionError("Choose how the money was paid.", { paymentMethod: "Required." });
  if (!body.paymentDate) return actionError("Enter the payment date.", { paymentDate: "Required." });
  if (body.paymentMethod === "Cheque" && !body.chequeDate)
    return actionError("Enter the date on the cheque.", { chequeDate: "Required for a cheque." });
  if (!isAmount(body.amount) || body.amount <= 0)
    return actionError("Enter the amount (more than 0).", { amount: "Must be more than 0." });
  if (!isAmount(body.taxDeductedAmount) || body.taxDeductedAmount < 0)
    return actionError("The tax deducted can't be negative.", { taxDeductedAmount: "Enter a valid amount." });

  if (body.paymentType === "Refund") {
    body.allocations = [];
    body.autoAllocate = false;
    body.taxDeductedAmount = 0;
  } else {
    const settles = round(body.amount + body.taxDeductedAmount, 2);
    const ids = new Set<number>();
    for (const allocation of body.allocations) {
      if (!allocation.purchaseInvoiceId || !isAmount(allocation.amount) || allocation.amount <= 0)
        return actionError("Every allocated amount must be more than 0.");
      if (ids.has(allocation.purchaseInvoiceId)) return actionError("An invoice is allocated twice.");
      ids.add(allocation.purchaseInvoiceId);
    }
    const allocated = round(body.allocations.reduce((sum, a) => sum + a.amount, 0), 2);
    if (allocated > settles)
      return actionError(
        `The allocations (${allocated.toFixed(2)}) are more than the payment plus the tax deducted (${settles.toFixed(2)}).`,
      );
    if (body.allocations.length > 0) body.autoAllocate = false;
  }

  return saveDocument(purchaseModule, () => purchaseApi.payments.create(body), null, { view, edit: view });
}

/** Takes the payment off its invoices (they are due again). */
export async function cancelPaymentAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.payments.cancel(id), "Payment cancelled.");
}

/** A pending cheque cleared, or bounced (which takes it off its invoices). */
export async function setChequeStatusAction(id: number, chequeStatus: "Cleared" | "Bounced"): Promise<ActionState> {
  if (chequeStatus !== "Cleared" && chequeStatus !== "Bounced") return actionError("Unknown cheque status.");
  return runDocumentAction(
    purchaseModule,
    () => purchaseApi.payments.setChequeStatus(id, chequeStatus),
    chequeStatus === "Cleared" ? "Cheque marked cleared." : "Cheque marked bounced.",
  );
}
