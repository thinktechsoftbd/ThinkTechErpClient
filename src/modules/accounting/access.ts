import type { AccessSubject } from "@/core/auth/roles";
import { ACCOUNTING_MANAGE_PERMISSION, ACCOUNTING_POST_PERMISSION } from "./types";

/** The API's AccountingManage policy: changes need ACCOUNTING.M; ACCOUNTING.V alone is read-only. */
export function canManageAccounting(user: AccessSubject) {
  return user.permissions.includes(ACCOUNTING_MANAGE_PERMISSION);
}

/** The API's AccountingPost policy: posting and unposting vouchers need ACCOUNTING.P. */
export function canPostVouchers(user: AccessSubject) {
  return user.permissions.includes(ACCOUNTING_POST_PERMISSION);
}
