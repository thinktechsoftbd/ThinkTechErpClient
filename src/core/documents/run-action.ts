import "server-only";
import { refresh, revalidatePath } from "next/cache";
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

type DocumentPaths = { view: (id: number) => string; edit: (id: number) => string };

/**
 * Where a document saved from the popup over its list goes: back to `list` (its form sends returnTo =
 * the list), replacing the popup's history entry so Back doesn't reopen it. Otherwise the usual paths.
 */
export function popupReturn(formData: FormData, list: string, paths: DocumentPaths) {
  return formData.get("returnTo") === list
    ? { paths: { ...paths, view: () => list }, replace: true }
    : { paths, replace: false };
}

/**
 * Saves a document (create or update), optionally posts it, then opens it. A post that fails after
 * the save lands on the saved draft's edit page with the reason, so nothing is entered twice.
 */
export async function saveDocument<T extends { id: number }>(
  module: ModuleDefinition,
  save: () => Promise<T>,
  post: ((id: number) => Promise<unknown>) | null,
  paths: DocumentPaths,
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
  // Fresh data where it lands: the list behind a popup was rendered before the save, and the router
  // would otherwise show it from its cache without the new document.
  const target = paths.view(saved.id);
  revalidatePath(target);
  redirect(target, replace ? RedirectType.replace : RedirectType.push);
}
