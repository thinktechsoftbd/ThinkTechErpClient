"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { websiteApi } from "./api";
import { websiteModule } from "./module";
import { getWebsiteTable } from "./tables";
import type { WebsiteRecord } from "./types";

function parsePayload(formData: FormData): WebsiteRecord | string {
  const raw = formData.get("payload");
  if (typeof raw !== "string") return "Missing record data.";
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return "The record must be a JSON object.";
    if (Object.keys(value).length === 0) return "Change at least one field before saving.";
    return value as WebsiteRecord;
  } catch {
    return "The record is not valid JSON.";
  }
}

/** Creates (id = null) or updates a website record from the RecordForm's JSON payload. */
export async function saveWebsiteRecordAction(
  table: string,
  id: string | null,
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!getWebsiteTable(table)) return actionError(`Unknown website table "${table}".`);
  const payload = parsePayload(formData);
  if (typeof payload === "string") return actionError(payload);

  try {
    await requireModuleAccess(websiteModule);
    if (id === null) await websiteApi.create(table, payload);
    else await websiteApi.update(table, id, payload);
  } catch (error) {
    return toActionError(error);
  }

  if (id === null) redirect(`/website/${table}`);
  refresh();
  return actionSuccess("Saved.");
}

export async function deleteWebsiteRecordAction(table: string, id: string, redirectTo?: string): Promise<ActionState> {
  if (!getWebsiteTable(table)) return actionError(`Unknown website table "${table}".`);
  try {
    await requireModuleAccess(websiteModule);
    await websiteApi.remove(table, id);
  } catch (error) {
    return toActionError(error);
  }
  if (redirectTo) redirect(redirectTo);
  refresh();
  return actionSuccess("Deleted.");
}
