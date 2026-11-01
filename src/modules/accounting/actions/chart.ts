"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, positiveInteger, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { accountingApi } from "../api";
import { accountingModule } from "../module";
import {
  ACCOUNT_NATURES,
  LEDGER_TYPES,
  PARTY_TYPES,
  type AccountNature,
  type ChartAccountUpsertRequest,
  type LedgerType,
  type PartyType,
} from "../types";

// Server Actions for the chart of accounts. The API re-checks ACCOUNTING.M and works out each
// account's level and nature from its parent; its refusals come back as form state.

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

function oneOf<T extends string>(values: readonly T[], value: string): T | null {
  return (values as readonly string[]).includes(value) ? (value as T) : null;
}

/** Creates (id = null) or updates an account; the hidden parentId field places it in the tree. */
export async function saveAccountAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: Record<string, string> = {};
  const name = formString(formData, "name");
  const code = formString(formData, "code");
  const description = formString(formData, "description");
  const sortOrderText = formString(formData, "sortOrder").replace(/,/g, "");
  const parentId = formString(formData, "parentId") ? positiveInteger(formData, "parentId") : null;
  const nature = formString(formData, "nature");
  const ledgerType = formString(formData, "ledgerType");
  const partyType = formString(formData, "partyType");

  if (!name) fieldErrors.name = "Required.";
  else if (name.length > 150) fieldErrors.name = "Max 150 characters.";
  if (code.length > 30) fieldErrors.code = "Max 30 characters.";
  if (description.length > 500) fieldErrors.description = "Max 500 characters.";
  if (sortOrderText && !/^\d{1,7}$/.test(sortOrderText)) fieldErrors.sortOrder = "Enter a whole number of 0 or more.";
  if (parentId === null && !oneOf(ACCOUNT_NATURES, nature)) fieldErrors.nature = "Choose the nature.";
  if (Object.keys(fieldErrors).length > 0) return actionError("Please correct the highlighted fields.", fieldErrors);

  const body: ChartAccountUpsertRequest = {
    parentId,
    code: code || null,
    name,
    nature: parentId === null ? (nature as AccountNature) : null,
    ledgerType: oneOf<LedgerType>(LEDGER_TYPES, ledgerType),
    partyType: oneOf<PartyType>(PARTY_TYPES, partyType),
    sortOrder: sortOrderText ? Number(sortOrderText) : 0,
    description: description || null,
    isActive: formData.get("isActive") === "on",
  };
  return mutate(
    () => (id === null ? accountingApi.chart.create(body) : accountingApi.chart.update(id, body)),
    id === null ? "Account added." : "Account saved.",
  );
}

/** The tree's checkbox: ticking activates the account, its branch and its parents; clearing deactivates the branch. */
export async function setAccountActiveAction(id: number, isActive: boolean): Promise<ActionState> {
  return mutate(() => accountingApi.chart.setActive(id, isActive), isActive ? "Account ticked." : "Account cleared.");
}

export async function deleteAccountAction(id: number): Promise<ActionState> {
  return mutate(() => accountingApi.chart.remove(id), "Account deleted.");
}

/** Adds the ready-made chart (assets, liabilities, equity, income, expenses) to an empty chart. */
export async function importStandardChartAction(): Promise<ActionState> {
  return mutate(() => accountingApi.chart.importStandard(), "Standard chart of accounts added.");
}
