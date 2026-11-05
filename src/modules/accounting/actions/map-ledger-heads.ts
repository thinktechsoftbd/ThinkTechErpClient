"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { inventoryApi } from "@/modules/inventory/api";
import { inventoryModule } from "@/modules/inventory/module";
import { purchaseApi } from "@/modules/purchase/api";
import { purchaseModule } from "@/modules/purchase/module";
import { salesApi } from "@/modules/sales/api";
import { salesModule } from "@/modules/sales/module";

type MapItem = { kind: "category" | "supplier" | "customer"; id: number; accSubClassId: number };

/**
 * Sets the ledger heads an invoice couldn't be finalized without (the Map popup): a category keeps everything
 * else as it is; a supplier or customer gets just its ledger head.
 */
export async function mapLedgerHeadsAction(items: MapItem[]): Promise<ActionState> {
  const valid = items.filter(
    (item) =>
      ["category", "supplier", "customer"].includes(item.kind) &&
      Number.isSafeInteger(item.id) && item.id > 0 && Number.isSafeInteger(item.accSubClassId) && item.accSubClassId > 0,
  );
  if (valid.length === 0 || valid.length !== items.length) return actionError("Choose a ledger head for each one.");

  try {
    for (const item of valid) {
      if (item.kind === "category") {
        await requireModuleAccess(inventoryModule);
        const category = await inventoryApi.categories.get(item.id);
        await inventoryApi.categories.update(item.id, {
          parentCategoryId: category.parentCategoryId,
          code: category.code,
          name: category.name,
          nameLocal: category.nameLocal,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          accSubClassId: item.accSubClassId,
        });
      } else if (item.kind === "supplier") {
        await requireModuleAccess(purchaseModule);
        await purchaseApi.suppliers.setLedgerHead(item.id, item.accSubClassId);
      } else {
        await requireModuleAccess(salesModule);
        await salesApi.customers.setLedgerHead(item.id, item.accSubClassId);
      }
    }
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess("Ledger heads mapped.");
}
