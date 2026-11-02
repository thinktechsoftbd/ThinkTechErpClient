import "server-only";
import { refresh } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { ApiError } from "@/core/api/errors";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionSuccess, type ActionState } from "@/core/forms/action-state";
import type { ModuleDefinition } from "@/core/modules/types";
import { withNotice } from "./payload";

/**
 * Runs a document action (post, cancel, approve, ...) from a Server Action: re-checks module
 * access, calls the API, then refreshes the page, or goes to `redirectTo` (e.g. the list after
 * deleting a draft). API errors come back as form state.
 */
export async function runDocumentAction(
  module: ModuleDefinition,
  call: () => Promise<unknown>,
  successMessage: string,
  redirectTo?: string,
): Promise<ActionState> {
  try {
    await requireModuleAccess(module);
    await call();
  } catch (error) {
    return toActionError(error);
  }
  if (redirectTo) redirect(redirectTo);
  refresh();
  return actionSuccess(successMessage);
}

/**
 * Saves a document (create or update), optionally posts it, then opens it. A post that fails after
 * the save lands on the saved draft's edit page with the reason, so nothing is entered twice.
 */
export async function saveDocument<T extends { id: number }>(
  module: ModuleDefinition,
  save: () => Promise<T>,
  post: ((id: number) => Promise<unknown>) | null,
  paths: { view: (id: number) => string; edit: (id: number) => string },
  /** What failed after saving, for the notice: "posted" or e.g. "approved". */
  postVerb = "posted",
  /** Replace the history entry when opening the saved document, e.g. so Back doesn't reopen the popup it was saved from. */
  replace = false,
): Promise<ActionState> {
  let saved: T;
  try {
    await requireModuleAccess(module);
    saved = await save();
  } catch (error) {
    return toActionError(error);
  }
  if (post) {
    try {
      await post(saved.id);
    } catch (error) {
      if (error instanceof ApiError) redirect(withNotice(paths.edit(saved.id), `Saved as a draft, but not ${postVerb}: ${error.message}`));
      throw error;
    }
  }
  redirect(paths.view(saved.id), replace ? RedirectType.replace : RedirectType.push);
}
