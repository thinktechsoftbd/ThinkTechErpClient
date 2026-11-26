"use server";

import { actionError, type ActionState } from "@/core/forms/action-state";
import { readIntent, readPayload } from "@/core/documents/payload";
import { popupReturn, runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { serviceInvoiceApi } from "../service-invoice-api";
import { serviceInvoiceModule } from "../service-invoice-module";
import type { ServiceInvoiceUpsertRequest } from "../service-invoice-types";

const list = "/warranty/service-invoices";
const paths = {
  view: (id: number) => `${list}/${id}`,
  edit: (id: number) => `${list}/${id}/edit`,
};

/**
 * Creates (id = null) or updates a draft service invoice, then opens it (or, from the popup, the list). Intent
 * "finalize" also posts it and its bill voucher; a missing ledger mapping leaves the saved draft as it was.
 */
export async function saveServiceInvoiceAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<ServiceInvoiceUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (body.lines.length === 0 && !(body.serviceAmount > 0)) return actionError("Add the parts used or a service amount.");
  if (body.saleType === "Credit" && !body.customerId)
    return actionError("A credit service invoice needs a customer on file. Choose one, or make it a cash invoice.", {
      customerId: "Required for credit.",
    });
  if (!body.warehouseId) return actionError("Choose the warehouse the parts come from.", { warehouseId: "Required." });

  const target = popupReturn(formData, list, paths);
  const finalize = readIntent(formData) === "finalize";
  return saveDocument(
    serviceInvoiceModule,
    () => (id === null ? serviceInvoiceApi.create(body) : serviceInvoiceApi.update(id, body)),
    finalize ? (savedId) => serviceInvoiceApi.finalize(savedId) : null,
    target.paths,
    "finalized",
    target.replace,
  );
}

/** Posts a draft first, then its bill voucher from the ledger mappings; the invoice is then locked. */
export async function finalizeServiceInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(serviceInvoiceModule, () => serviceInvoiceApi.finalize(id), "Service invoice finalized: its bill voucher is posted.");
}

/** Deletes a draft from its page, then opens the list. */
export async function deleteServiceInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(serviceInvoiceModule, () => serviceInvoiceApi.remove(id), "Service invoice deleted.", list);
}

/** Deletes a draft from the list: the list reloads in place, keeping its filters, sort and page. */
export async function deleteServiceInvoiceFromListAction(id: number): Promise<ActionState> {
  return runDocumentAction(serviceInvoiceModule, () => serviceInvoiceApi.remove(id), "Service invoice deleted.");
}

/** A posted invoice that isn't finalized back to draft, then its edit page. */
export async function unpostServiceInvoiceAction(id: number): Promise<ActionState> {
  return runDocumentAction(serviceInvoiceModule, () => serviceInvoiceApi.unpost(id), "Back to draft.", paths.edit(id));
}

/** A posted invoice that isn't finalized back to draft, then deleted; the list reloads in place. */
export async function deletePostedServiceInvoiceFromListAction(id: number): Promise<ActionState> {
  return runDocumentAction(
    serviceInvoiceModule,
    async () => {
      await serviceInvoiceApi.unpost(id);
      await serviceInvoiceApi.remove(id);
    },
    "Service invoice deleted.",
  );
}
