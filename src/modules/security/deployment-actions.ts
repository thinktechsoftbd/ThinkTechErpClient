"use server";

import { refresh } from "next/cache";
import { requirePermission } from "@/core/auth/guards";
import { formString, optionalString, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { deploymentApi } from "./deployment-api";
import {
  DEPLOYMENT_DESCRIPTION_MAX_LENGTH,
  DEPLOYMENT_MANAGE_PERMISSION,
  DEPLOYMENT_MAX_DESCRIPTIONS,
  DEPLOYMENT_REMARKS_MAX_LENGTH,
  type DeploymentUpsertRequest,
} from "./deployment-types";
import { UUID_PATTERN } from "./types";

/**
 * Adds (deploymentId = null) or changes a deployment of the organization from its modal. The detail lines come
 * as repeated "description" fields, in order; empty ones are dropped.
 */
export async function saveDeploymentAction(
  organizationObjectId: string,
  deploymentId: number | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const fieldErrors: Record<string, string> = {};

  const serviceTypeId = Number(formString(formData, "serviceTypeId"));
  if (!Number.isSafeInteger(serviceTypeId) || serviceTypeId <= 0) fieldErrors.serviceTypeId = "Choose the service type.";

  const remarks = optionalString(formData, "remarks");
  if (remarks && remarks.length > DEPLOYMENT_REMARKS_MAX_LENGTH)
    fieldErrors.remarks = `Max ${DEPLOYMENT_REMARKS_MAX_LENGTH} characters.`;

  const descriptions = formData
    .getAll("description")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (descriptions.length > DEPLOYMENT_MAX_DESCRIPTIONS)
    fieldErrors.details = `At most ${DEPLOYMENT_MAX_DESCRIPTIONS} detail lines.`;
  else if (descriptions.some((description) => description.length > DEPLOYMENT_DESCRIPTION_MAX_LENGTH))
    fieldErrors.details = `A detail line can be at most ${DEPLOYMENT_DESCRIPTION_MAX_LENGTH} characters.`;

  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);
  if (!UUID_PATTERN.test(organizationObjectId)) return actionError("The organization couldn't be found.");

  const body: DeploymentUpsertRequest = {
    serviceTypeId,
    isActive: formData.get("isActive") === "on",
    remarks,
    details: descriptions.map((description) => ({ description })),
  };
  try {
    await requirePermission(DEPLOYMENT_MANAGE_PERMISSION);
    if (deploymentId === null) await deploymentApi.create(organizationObjectId, body);
    else await deploymentApi.update(deploymentId, body);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(deploymentId === null ? "Deployment added." : "Deployment saved.");
}

/** Deletes a deployment with its detail lines. */
export async function deleteDeploymentAction(deploymentId: number): Promise<ActionState> {
  try {
    await requirePermission(DEPLOYMENT_MANAGE_PERMISSION);
    await deploymentApi.remove(deploymentId);
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Deployment deleted.");
}
