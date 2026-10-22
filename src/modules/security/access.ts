import type { AccessSubject } from "@/core/auth/roles";
import { SECURITY_MANAGE_PERMISSION } from "./types";

/** The API's SecurityManage policy: changes need SECURITY.M; SECURITY.V alone is read-only. */
export function canManageSecurity(user: AccessSubject) {
  return user.permissions.includes(SECURITY_MANAGE_PERMISSION);
}
