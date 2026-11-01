import type { AccessSubject } from "@/core/auth/roles";
import { SALES_MANAGE_PERMISSION } from "./types";

/** The API's SalesManage policy: changes need SALES.M; SALES.V alone is read-only. */
export function canManageSales(user: AccessSubject) {
  return user.permissions.includes(SALES_MANAGE_PERMISSION);
}
