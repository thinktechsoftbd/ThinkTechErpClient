import type { AccessSubject } from "@/core/auth/roles";
import { ACCOUNTING_MANAGE_PERMISSION } from "./types";

/** The API's AccountingManage policy: changes need ACCOUNTING.M; ACCOUNTING.V alone is read-only. */
export function canManageAccounting(user: AccessSubject) {
  return user.permissions.includes(ACCOUNTING_MANAGE_PERMISSION);
}
