"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError } from "@/core/api/errors";
import { requireModuleAccess } from "@/core/auth/guards";
import { readIntent, readPayload } from "@/core/documents/payload";
import { popupReturn, runDocumentAction, saveDocument } from "@/core/documents/run-action";
import { formString, optionalString, positiveInteger, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { inventoryApi } from "../api";
import { inventoryModule } from "../module";
import {
  ADJUSTMENT_REASONS,
  type StockAdjustmentUpsertRequest,
  type StockCountCreateRequest,
  type StockCountUpdateRequest,
  type StockLineRequest,
  type StockTransferReceiveRequest,
  type StockTransferUpsertRequest,
} from "../types";

// Opening stock, stock adjustments, transfers and counts. Editors post their state as JSON
// ("payload") plus an "intent": "save" keeps a draft, "post" posts (or dispatches) it too.

const OPENING_REASON = "Opening";
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const unreadable = () => actionError("The form couldn't be read. Reload the page and try again.");

const openingPaths = {
  view: (id: number) => `/inventory/opening-stock/${id}`,
  edit: (id: number) => `/inventory/opening-stock/${id}/edit`,
};
const adjustmentPaths = {
  view: (id: number) => `/inventory/adjustments/${id}`,
  edit: (id: number) => `/inventory/adjustments/${id}/edit`,
};
const transferPaths = {
  view: (id: number) => `/inventory/transfers/${id}`,
  edit: (id: number) => `/inventory/transfers/${id}/edit`,
};

const isQuantity = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Checks every document shares: a date, at least one line, and numbers where numbers belong. */
function checkLines(lines: StockLineRequest[] | undefined, positiveOnly: boolean): ActionState | null {
  if (!Array.isArray(lines) || lines.length === 0) return actionError("Add at least one item.");
  for (const [index, line] of lines.entries()) {
    if (!isQuantity(line.quantity) || line.quantity === 0 || (positiveOnly && line.quantity < 0))
      return actionError(`Line ${index + 1}: enter a quantity ${positiveOnly ? "above 0" : "other than 0"}.`);
  }
  return null;
}

// ---- Opening stock and stock adjustments

/** Creates (id = null) or updates a draft opening stock (an adjustment with reason Opening). */
export async function saveOpeningStockAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const payload = readPayload<StockAdjustmentUpsertRequest>(formData);
  if (!payload) return unreadable();
  const body: StockAdjustmentUpsertRequest = { ...payload, reason: OPENING_REASON };
  if (!body.adjustmentDate || !DATE_PATTERN.test(body.adjustmentDate)) return actionError("Enter the date.", { date: "Required." });
  if (!body.warehouseId) return actionError("Choose the warehouse the stock is in.", { warehouseId: "Required." });
  const invalid = checkLines(body.lines, true);
  if (invalid) return invalid;
  const missingCost = body.lines.findIndex((line) => !isQuantity(line.unitCost) || line.unitCost < 0);
  if (missingCost >= 0) return actionError(`Line ${missingCost + 1}: enter the cost per unit.`);

  return saveDocument(
    inventoryModule,
    () => (id === null ? inventoryApi.adjustments.create(body) : inventoryApi.adjustments.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => inventoryApi.adjustments.action(savedId, "post") : null,
    openingPaths,
  );
}

/** Creates (id = null) or updates a draft stock adjustment (damage, expired, lost, ...). */
export async function saveAdjustmentAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<StockAdjustmentUpsertRequest>(formData);
  if (!body) return unreadable();
  if (!(ADJUSTMENT_REASONS as readonly string[]).includes(body.reason))
    return actionError("Choose the reason for the adjustment.", { reason: "Required." });
  if (!body.adjustmentDate || !DATE_PATTERN.test(body.adjustmentDate)) return actionError("Enter the date.", { date: "Required." });
  if (!body.warehouseId) return actionError("Choose the warehouse.", { warehouseId: "Required." });
  const invalid = checkLines(body.lines, false);
  if (invalid) return invalid;

  const target = popupReturn(formData, "/inventory/adjustments", adjustmentPaths);
  return saveDocument(
    inventoryModule,
    () => (id === null ? inventoryApi.adjustments.create(body) : inventoryApi.adjustments.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => inventoryApi.adjustments.action(savedId, "post") : null,
    target.paths,
    "posted",
    target.replace,
  );
}

/** Posts a draft opening stock or adjustment: the stock moves now. */
export async function postAdjustmentAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.adjustments.action(id, "post"), "Posted. The stock is updated.");
}

/** Cancels a posted opening stock or adjustment: its stock movement is reversed. */
export async function cancelAdjustmentAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.adjustments.action(id, "cancel"), "Cancelled. The stock change was reversed.");
}

export async function deleteOpeningStockAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.adjustments.remove(id), "Draft deleted.", "/inventory/opening-stock");
}

export async function deleteAdjustmentAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.adjustments.remove(id), "Draft deleted.", "/inventory/adjustments");
}

// ---- Stock transfers

/** Creates (id = null) or updates a draft transfer; intent "post" dispatches it too. */
export async function saveTransferAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<StockTransferUpsertRequest>(formData);
  if (!body) return unreadable();
  if (!body.transferDate || !DATE_PATTERN.test(body.transferDate)) return actionError("Enter the date.", { date: "Required." });
  if (!body.fromWarehouseId) return actionError("Choose the warehouse the stock leaves from.", { warehouseId: "Required." });
  if (!body.toWarehouseId) return actionError("Choose the warehouse the stock goes to.", { toWarehouseId: "Required." });
  if (body.fromWarehouseId === body.toWarehouseId)
    return actionError("The stock must go to a different warehouse.", { toWarehouseId: "Choose another warehouse." });
  const invalid = checkLines(body.lines, true);
  if (invalid) return invalid;

  const target = popupReturn(formData, "/inventory/transfers", transferPaths);
  return saveDocument(
    inventoryModule,
    () => (id === null ? inventoryApi.transfers.create(body) : inventoryApi.transfers.update(id, body)),
    readIntent(formData) === "post" ? (savedId) => inventoryApi.transfers.action(savedId, "dispatch") : null,
    target.paths,
    "posted",
    target.replace,
  );
}

/** Dispatches a draft transfer: the stock leaves the source warehouse and is in transit. */
export async function dispatchTransferAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.transfers.action(id, "dispatch"), "Dispatched. The stock is in transit.");
}

/** Receives an in-transit transfer; lines left out of the payload arrived in full. */
export async function receiveTransferAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<StockTransferReceiveRequest>(formData);
  if (!body || !Array.isArray(body.lines)) return unreadable();
  if (body.lines.some((line) => !Number.isSafeInteger(line.lineId) || !isQuantity(line.receivedBaseQuantity) || line.receivedBaseQuantity < 0))
    return actionError("Enter the quantity received on every line (0 or more).");
  try {
    await requireModuleAccess(inventoryModule);
    await inventoryApi.receiveTransfer(id, { lines: body.lines });
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Received. The stock is in the destination warehouse.");
}

/** Cancels a transfer that was dispatched or received: whatever was posted is reversed. */
export async function cancelTransferAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.transfers.action(id, "cancel"), "Transfer cancelled. Its stock movements were reversed.");
}

export async function deleteTransferAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.transfers.remove(id), "Draft deleted.", "/inventory/transfers");
}

// ---- Stock counts

/** Starts a count (the API takes the system quantities now) and opens its count sheet. */
export async function createCountAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const countDate = formString(formData, "countDate");
  const warehouseId = positiveInteger(formData, "warehouseId");
  const categoryRaw = formString(formData, "categoryId");
  const categoryId = categoryRaw ? positiveInteger(formData, "categoryId") : null;
  if (!DATE_PATTERN.test(countDate)) return actionError("Enter the count date.", { countDate: "Required." });
  if (!warehouseId) return actionError("Choose the warehouse to count.", { warehouseId: "Required." });
  if (categoryRaw && !categoryId) return actionError("Choose a category from the list.", { categoryId: "Invalid." });

  const body: StockCountCreateRequest = {
    countDate,
    warehouseId,
    categoryId,
    includeZeroStock: formData.get("includeZeroStock") === "on",
    remarks: optionalString(formData, "remarks"),
  };
  let createdId: number;
  try {
    await requireModuleAccess(inventoryModule);
    createdId = (await inventoryApi.counts.create(body)).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/inventory/counts/${createdId}`);
}

/** Saves the counted quantities; intent "post" then posts the count (the differences are adjusted). */
export async function saveCountAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<StockCountUpdateRequest>(formData);
  if (!body || !Array.isArray(body.lines)) return unreadable();
  if (body.lines.some((line) => line.countedQuantity !== null && (!isQuantity(line.countedQuantity) || line.countedQuantity < 0)))
    return actionError("Counted quantities must be 0 or more (leave a line empty if it wasn't counted).");
  const post = readIntent(formData) === "post";

  try {
    await requireModuleAccess(inventoryModule);
    await inventoryApi.counts.saveCounted(id, { remarks: body.remarks ?? null, lines: body.lines });
  } catch (error) {
    return toActionError(error);
  }
  if (post) {
    try {
      await inventoryApi.counts.action(id, "post");
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      refresh();
      return actionError(`The counts were saved, but the count wasn't posted: ${error.message}`);
    }
  }
  refresh();
  return actionSuccess(post ? "Count posted. The differences were adjusted in stock." : "Counts saved.");
}

/** Cancels a count that is still in progress; nothing is adjusted. */
export async function cancelCountAction(id: number): Promise<ActionState> {
  return runDocumentAction(inventoryModule, () => inventoryApi.counts.action(id, "cancel"), "Count cancelled.");
}
