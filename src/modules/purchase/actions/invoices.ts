"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { popupReturn, runDocumentAction, saveDocument } from "@/core/documents/run-action";
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
  if (body.purchaseType === "Credit" && !body.supplierId && !body.addSupplier)
    return actionError("A credit purchase needs a supplier on file. Choose one, tick Add new supplier, or make it a cash purchase.", {
      supplierId: "Required for credit.",
    });
  if (body.addSupplier && (!body.supplierName || !body.supplierMobile || !body.supplierAddressLine1))
    return actionError("Enter the new supplier's name, mobile and address line 1.", { supplierId: "Required." });
  if (body.receivesStock && !body.warehouseId)
    return actionError("Choose the warehouse the stock goes into.", { warehouseId: "Required." });
  if (!body.invPaymentSourceDId)
    return actionError("Choose the payment source and its type.", { invPaymentSourceDId: "Required." });

  const target = popupReturn(formData, "/purchase/invoices", paths);
  // "finalize" posts the invoice and its bill voucher; a missing ledger mapping leaves the saved draft as it was.
  const intent = readIntent(formData);
  return saveDocument(
    purchaseModule,
    () => (id === null ? purchaseApi.invoices.create(body) : purchaseApi.invoices.update(id, body)),
    intent === "save" ? null : (savedId) => purchaseApi.invoices.action(savedId, intent),
    target.paths,
    intent === "finalize" ? "finalized" : "posted",
    target.replace,
  );
}

export async function postInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.invoices.action(id, "post"), "Invoice posted.");
}

/** Posts a draft first, then the bill voucher from the ledger mappings; the invoice is then locked. */
export async function finalizeInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.invoices.action(id, "finalize"), "Invoice finalized: its bill voucher is posted.");
}

export async function cancelInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.invoices.action(id, "cancel"), "Invoice cancelled.");
}

export async function deleteInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(purchaseModule, () => purchaseApi.invoices.remove(id), "Draft deleted.", "/purchase/invoices");
}
