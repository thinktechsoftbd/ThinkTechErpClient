import type { AccessSubject } from "@/core/auth/roles";
import { AREA_MANAGE_PERMISSION, SETTINGS_MANAGE_PERMISSION } from "./types";

/** The API's SettingsManage policy: changes need SETTING.M; SETTING.V alone is read-only. */
export function canManageSettings(user: AccessSubject) {
  return user.permissions.includes(SETTINGS_MANAGE_PERMISSION);
}

/** The API's AreaManage policy: areas need AREA.M; AREA.V alone is read-only. */
export function canManageAreas(user: AccessSubject) {
  return user.permissions.includes(AREA_MANAGE_PERMISSION);
}
