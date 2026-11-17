"use server";

import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/core/auth/guards";
import { readPayload } from "@/core/documents/payload";
import { runDocumentAction } from "@/core/documents/run-action";
import { formString, toActionError } from "@/core/forms/action-errors";
import { actionError, type ActionState } from "@/core/forms/action-state";
import { warrantyApi } from "../api";
import { warrantyModule } from "../module";
import {
  JOB_TYPES,
  OPEN_STATUSES,
  RESOLUTIONS,
  type ServiceJobInvoiceRequest,
  type ServiceJobItemRequest,
  type ServiceJobUpsertRequest,
} from "../types";
import { checked, hasErrors, invalid, mutate, oneOf, optionalText, readAmount, requiredText, type FieldErrors } from "./form";

// Server Actions for service jobs. The API re-checks WARRANTY.M and the job's rules (open, billed, ...).

const jobPath = (id: number) => `/warranty/service/jobs/${id}`;

/** Opens (id = null) or changes a job from the job form's JSON payload, then shows the job. */
export async function saveJobAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<ServiceJobUpsertRequest>(formData);
  if (!body) return actionError("The form couldn't be read. Reload the page and try again.");
  if (!oneOf(JOB_TYPES, body.jobType)) return actionError("Choose Warranty or Paid.");
  if (!body.deviceTypeLookupDataId) return actionError("Choose the device type.", { deviceTypeLookupDataId: "Required." });
  if (!body.problemDescription?.trim()) return actionError("Describe the problem.", { problemDescription: "Required." });
  if (!body.customerId && !body.customerMobile?.trim())
    return actionError("Pick the customer, or enter the walk-in customer's mobile number.", { customerMobile: "Required for a walk-in customer." });

  let saved: number;
  try {
    await requireModuleAccess(warrantyModule);
    saved = (id === null ? await warrantyApi.jobs.create(body) : await warrantyApi.jobs.update(id, body)).id;
  } catch (error) {
    return toActionError(error);
  }
  redirect(jobPath(saved));
}

export async function deleteJobAction(id: number): Promise<ActionState> {
  return runDocumentAction(warrantyModule, () => warrantyApi.jobs.remove(id), "Job deleted.", "/warranty/service");
}

/** Replaces the job's parts and charges (the items editor's JSON payload). */
export async function saveJobItemsAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const body = readPayload<{ items: ServiceJobItemRequest[] }>(formData);
  if (!body || !Array.isArray(body.items)) return actionError("The items couldn't be read. Reload the page and try again.");
  return mutate(() => warrantyApi.jobs.saveItems(id, body.items), "Items saved.");
}

/** Moves the job along (Ready needs how it ended); a note alone adds to the timeline. */
export async function changeJobStatusAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const status = formString(formData, "status");
  if (!oneOf(OPEN_STATUSES, status)) fieldErrors.status = "Choose a status.";
  const resolution = formString(formData, "resolution") || null;
  if (resolution !== null && !oneOf(RESOLUTIONS, resolution)) fieldErrors.resolution = "Choose how the job ended.";
  if (status === "Ready" && resolution === null && formData.get("hasResolution") !== "true")
    fieldErrors.resolution = "Required to mark the job ready.";
  const body = {
    status,
    resolution,
    resolutionNote: optionalText(formData, "resolutionNote", 2000, fieldErrors),
    note: optionalText(formData, "note", 1000, fieldErrors),
    customerNotified: checked(formData, "customerNotified"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.jobs.status(id, body), "Job updated.");
}

/** The customer's answer to the estimate. */
export async function jobApprovalAction(id: number, approved: boolean, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = {
    approved,
    estimatedAmount: readAmount(formData, "estimatedAmount", null, fieldErrors),
    note: optionalText(formData, "note", 1000, fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.jobs.approval(id, body), approved ? "Estimate approved; the job is in repair." : "Estimate declined.");
}

/** Bills the job on a sales invoice made from its items (completed at once when "post" is ticked). */
export async function billJobAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const saleType = formString(formData, "saleType");
  if (saleType !== "Cash" && saleType !== "Credit") fieldErrors.saleType = "Choose Cash or Credit.";
  const paidAmount = readAmount(formData, "paidAmount", 0, fieldErrors);
  const body: ServiceJobInvoiceRequest = {
    saleType: saleType === "Credit" ? "Credit" : "Cash",
    paidAmount,
    paymentMethod: saleType === "Credit" && paidAmount === 0 ? null : formString(formData, "paymentMethod") || "Cash",
    remarks: optionalText(formData, "remarks", 1000, fieldErrors),
    post: checked(formData, "post"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.jobs.invoice(id, body), body.post ? "Job billed and the invoice completed." : "Draft invoice made for the job.");
}

export async function deliverJobAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body = {
    deliveredToName: optionalText(formData, "deliveredToName", 150, fieldErrors),
    note: optionalText(formData, "note", 1000, fieldErrors),
    customerNotified: checked(formData, "customerNotified"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.jobs.deliver(id, body), "Device delivered.");
}

export async function cancelJobAction(id: number, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const reason = requiredText(formData, "reason", 500, fieldErrors);
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);
  return mutate(() => warrantyApi.jobs.cancel(id, reason), "Job cancelled.");
}
