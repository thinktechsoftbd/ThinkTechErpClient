"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { salesApi } from "../api";
import { salesModule } from "../module";
import type { SalesReturnUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/sales/returns/${id}`,
  edit: (id: number) => `/sales/returns/${id}/edit`,
};

/**
 * Creates (id = null) or updates a draft sales return; intent "post" posts it too (resellable goods
 * go back into stock, the refund or deduction is recorded). Whether the sale has a customer to deduct
 * from, and how much may be refunded, is the API's call.
 */
export async function saveReturnAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<SalesReturnUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.salesInvoiceId) return actionError("Choose the sale the goods came back from.");
  if (!body.returnDate) return actionError("Enter the return date.", { returnDate: "Required." });
  const lines = (Array.isArray(body.lines) ? body.lines : []).filter((line) => line.quantity > 0);
  if (lines.length === 0) return actionError("Enter the quantity coming back for at least one item.");
  if (body.settlementType !== "Refund" && body.settlementType !== "AdjustDue")
    return actionError("Choose to refund the money now or to deduct it from the customer's dues.");
  if (body.settlementType === "Refund" && !body.refundMethod)
    return actionError("Choose how the money is refunded.", { refundMethod: "Required." });

  const request: SalesReturnUpsertRequest = { ...body, lines };
  return saveDocument(
    salesModule,
    () => (id === null ? salesApi.returns.create(request) : salesApi.returns.update(id, request)),
    readIntent(formData) === "post" ? (savedId) => salesApi.returns.action(savedId, "post") : null,
    paths,
  );
}

export async function postReturnAction(id: number): Promise<ActionState> {
  return runDocumentAction(salesModule, () => salesApi.returns.action(id, "post"), "Return posted.");
}

export async function cancelReturnAction(id: number): Promise<ActionState> {
  return runDocumentAction(
    salesModule,
    () => salesApi.returns.action(id, "cancel"),
    "Return cancelled; the goods are out of stock again and the refund or deduction is undone.",
  );
}

export async function deleteReturnAction(id: number): Promise<ActionState> {
  return runDocumentAction(salesModule, () => salesApi.returns.remove(id), "Draft deleted.", "/sales/returns");
}
