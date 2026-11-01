"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { salesApi } from "../api";
import { salesModule } from "../module";
import type { SalesInvoiceUpsertRequest } from "../types";

const paths = {
  view: (id: number) => `/sales/invoices/${id}`,
  edit: (id: number) => `/sales/invoices/${id}/edit`,
};

/** Creates (id = null) or updates a draft sale; intent "post" completes it (posts) too. */
export async function saveSaleAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<SalesInvoiceUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (body.lines.length === 0) return actionError("Add at least one item.");
  if (body.saleType === "Credit" && !body.customerId)
    return actionError("A credit sale needs a customer on file. Choose or add one, or make it a cash sale.", {
      customerId: "Required for credit.",
    });
  if (!body.warehouseId) return actionError("Choose the warehouse the goods are sold from.", { warehouseId: "Required." });

  return saveDocument(
    salesModule,
    () => (id === null ? salesApi.invoices.create(body) : salesApi.invoices.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => salesApi.invoices.action(savedId, "post") : null,
    paths,
  );
}

export async function postSaleAction(id: number): Promise<ActionState> {
  return runDocumentAction(salesModule, () => salesApi.invoices.action(id, "post"), "Sale completed.");
}

export async function cancelSaleAction(id: number): Promise<ActionState> {
  return runDocumentAction(salesModule, () => salesApi.invoices.action(id, "cancel"), "Sale cancelled; the stock is back.");
}

export async function deleteSaleAction(id: number): Promise<ActionState> {
  return runDocumentAction(salesModule, () => salesApi.invoices.remove(id), "Draft deleted.", "/sales/invoices");
}
