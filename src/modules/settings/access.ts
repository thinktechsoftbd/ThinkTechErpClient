import type { AccessSubject } from "@/core/auth/roles";
import { SETTINGS_MANAGE_PERMISSION } from "./types";

/** The API's SettingsManage policy: changes need SETTING.M; SETTING.V alone is read-only. */
export function canManageSettings(user: AccessSubject) {
  return user.permissions.includes(SETTINGS_MANAGE_PERMISSION);
}
