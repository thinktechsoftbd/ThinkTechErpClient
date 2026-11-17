import type { AccessSubject } from "@/core/auth/roles";
import { WARRANTY_MANAGE_PERMISSION } from "./types";

/** The API's WarrantyManage policy: changes need WARRANTY.M; WARRANTY.V alone is read-only. */
export function canManageWarranty(user: AccessSubject) {
  return user.permissions.includes(WARRANTY_MANAGE_PERMISSION);
}
