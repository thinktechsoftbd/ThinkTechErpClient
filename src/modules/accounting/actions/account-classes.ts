"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { accountingApi } from "../api";
import { accountingModule } from "../module";
import { ACCOUNT_CLASS_MAX_NAME, EDITABLE_ACCOUNT_CLASS_KINDS, type EditableAccountClassKind } from "../types";

// Server Actions for the chart of accounts tree on the acc_* tables. The API re-checks ACCOUNTING.M, numbers
// new accounts and refuses deleting a node with children; its refusals come back as the message.

async function mutate(call: () => Promise<unknown>, successMessage: string): Promise<ActionState> {
  try {
    await requireModuleAccess(accountingModule);
    await call();
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(successMessage);
}

/** What is wrong with the arguments (they come from the browser), or null. */
function problem(kind: string, id: number, name?: string): string | null {
  if (!(EDITABLE_ACCOUNT_CLASS_KINDS as readonly string[]).includes(kind)) return "Only main, map and sub classes can be changed.";
  if (!Number.isInteger(id) || id < 1) return "Select a node in the tree first.";
  if (name === undefined) return null;
  const max = ACCOUNT_CLASS_MAX_NAME[kind as EditableAccountClassKind];
  if (!name.trim()) return "Name is required.";
  return name.trim().length > max ? `The name can be at most ${max} characters.` : null;
}

/** Adds a child of `kind` under the selected node (parentId) with the next code. */
export async function addAccountClassAction(kind: EditableAccountClassKind, parentId: number, name: string): Promise<ActionState> {
  const error = problem(kind, parentId, name);
  if (error) return actionError(error);
  return mutate(() => accountingApi.accountClasses.create({ kind, parentId, name: name.trim() }), "Account added.");
}

export async function renameAccountClassAction(kind: EditableAccountClassKind, id: number, name: string): Promise<ActionState> {
  const error = problem(kind, id, name);
  if (error) return actionError(error);
  return mutate(() => accountingApi.accountClasses.rename(kind, id, name.trim()), "Account renamed.");
}

export async function deleteAccountClassAction(kind: EditableAccountClassKind, id: number): Promise<ActionState> {
  const error = problem(kind, id);
  if (error) return actionError(error);
  return mutate(() => accountingApi.accountClasses.remove(kind, id), "Account deleted.");
}
