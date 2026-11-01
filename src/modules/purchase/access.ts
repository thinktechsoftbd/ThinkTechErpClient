import type { AccessSubject } from "@/core/auth/roles";
import { PURCHASE_MANAGE_PERMISSION } from "./types";

/** The API's PurchaseManage policy: changes need PURCHASE.M; PURCHASE.V alone is read-only. */
export function canManagePurchase(user: AccessSubject) {
  return user.permissions.includes(PURCHASE_MANAGE_PERMISSION);
}
