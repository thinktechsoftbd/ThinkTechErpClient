"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { purchaseApi } from "../api";
import { purchaseModule } from "../module";
import type { PurchaseInvoiceUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/purchase/invoices/${id}`,
  edit: (id: number) => `/purchase/invoices/${id}/edit`,
};

/** Creates (id = null) or updates a draft invoice; intent "post" posts it too. */
export async function saveInvoiceAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<PurchaseInvoiceUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (body.lines.length === 0) return actionError("Add at least one item.");
  if (body.purchaseType === "Credit" && !body.supplierId)
    return actionError("A credit purchase needs a supplier on file. Choose one, or make it a cash purchase.", {
      supplierId: "Required for credit.",
    });
  if (body.receivesStock && !body.warehouseId)
    return actionError("Choose the warehouse the stock goes into.", { warehouseId: "Required." });

  return saveDocument(
    purchaseModule,
    () => (id === null ? purchaseApi.invoices.create(body) : purchaseApi.invoices.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => purchaseApi.invoices.action(savedId, "post") : null,
    paths,
  );
}

export async function postInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.invoices.action(id, "post"), "Invoice posted.");
}

export async function cancelInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.invoices.action(id, "cancel"), "Invoice cancelled.");
}

export async function deleteInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.invoices.remove(id), "Draft deleted.", "/purchase/invoices");
}
