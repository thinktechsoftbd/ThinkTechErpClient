import type { AccessSubject } from "@/core/auth/roles";
import { SMS_MANAGE_PERMISSION } from "./types";

/** The API's SmsManage policy: changes need SMS.M; SMS.V alone is read-only. */
export function canManageSms(user: AccessSubject) {
  return user.permissions.includes(SMS_MANAGE_PERMISSION);
}
