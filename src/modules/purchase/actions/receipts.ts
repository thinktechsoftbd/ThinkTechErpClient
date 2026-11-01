"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { purchaseApi } from "../api";
import { purchaseModule } from "../module";
import type { GoodsReceiptUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/purchase/goods-receipts/${id}`,
  edit: (id: number) => `/purchase/goods-receipts/${id}/edit`,
};

/** Creates (id = null) or updates a draft goods receipt; intent "post" posts it too (the stock comes in). */
export async function saveReceiptAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<GoodsReceiptUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.supplierId) return actionError("Choose the supplier the goods came from.", { supplierId: "Required." });
  if (!body.warehouseId) return actionError("Choose the warehouse the stock goes into.", { warehouseId: "Required." });
  if (body.lines.length === 0) return actionError("Add at least one item.");

  return saveDocument(
    purchaseModule,
    () => (id === null ? purchaseApi.receipts.create(body) : purchaseApi.receipts.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => purchaseApi.receipts.action(savedId, "post") : null,
    paths,
  );
}

export async function postReceiptAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.receipts.action(id, "post"), "Goods receipt posted.");
}

export async function cancelReceiptAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.receipts.action(id, "cancel"), "Goods receipt cancelled.");
}

export async function deleteReceiptAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.receipts.remove(id), "Draft deleted.", "/purchase/goods-receipts");
}
