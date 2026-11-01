import type { AccessSubject } from "@/core/auth/roles";
import { INVENTORY_MANAGE_PERMISSION } from "./types";

/** The API's InventoryManage policy: changes need INVENTORY.M; INVENTORY.V alone is read-only. */
export function canManageInventory(user: AccessSubject) {
  return user.permissions.includes(INVENTORY_MANAGE_PERMISSION);
}
