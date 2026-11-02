"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { popupReturn, runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { purchaseApi } from "../api";
import { purchaseModule } from "../module";
import type { PurchaseOrderUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/purchase/orders/${id}`,
  edit: (id: number) => `/purchase/orders/${id}/edit`,
};

/** Creates (id = null) or updates a draft order; intent "post" approves it too. */
export async function saveOrderAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<PurchaseOrderUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!body.supplierId) return actionError("Choose the supplier you are ordering from.", { supplierId: "Required." });
  if (!body.warehouseId) return actionError("Choose the warehouse the goods are delivered to.", { warehouseId: "Required." });
  if (body.lines.length === 0) return actionError("Add at least one item.");

  const target = popupReturn(formData, "/purchase/orders", paths);
  return saveDocument(
    purchaseModule,
    () => (id === null ? purchaseApi.orders.create(body) : purchaseApi.orders.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => purchaseApi.orders.action(savedId, "approve") : null,
    target.paths,
    "approved",
    target.replace,
  );
}

export async function approveOrderAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.orders.action(id, "approve"), "Order approved.");
}

export async function closeOrderAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.orders.action(id, "close"), "Order closed.");
}

export async function cancelOrderAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.orders.action(id, "cancel"), "Order cancelled.");
}

export async function deleteOrderAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.orders.remove(id), "Draft deleted.", "/purchase/orders");
}
