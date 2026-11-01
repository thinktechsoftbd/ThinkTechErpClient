"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { purchaseApi } from "../api";
import { purchaseModule } from "../module";
import type { PurchaseReturnUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/purchase/returns/${id}`,
  edit: (id: number) => `/purchase/returns/${id}/edit`,
};

/** Creates (id = null) or updates a draft return; intent "post" posts it too (the stock goes out). */
export async function saveReturnAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<PurchaseReturnUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.warehouseId) return actionError("Choose the warehouse the goods leave from.", { warehouseId: "Required." });
  if (body.settlementType === "AdjustDue" && !body.supplierId)
    return actionError("Deducting from dues needs a supplier on file. Choose one, or settle by refund.", {
      supplierId: "Required to deduct from dues.",
    });
  if (body.settlementType === "Refund" && !body.refundMethod)
    return actionError("Choose how the refund is received.", { refundMethod: "Required." });
  if (body.lines.length === 0) return actionError("Add at least one item.");

  return saveDocument(
    purchaseModule,
    () => (id === null ? purchaseApi.returns.create(body) : purchaseApi.returns.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => purchaseApi.returns.action(savedId, "post") : null,
    paths,
  );
}

export async function postReturnAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.returns.action(id, "post"), "Return posted.");
}

export async function cancelReturnAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.returns.action(id, "cancel"), "Return cancelled.");
}

export async function deleteReturnAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.returns.remove(id), "Draft deleted.", "/purchase/returns");
}
