import type { AccessSubject } from "@/core/auth/roles";
import {
  AREA_MANAGE_PERMISSION,
  DISTRICT_MANAGE_PERMISSION,
  DIVISION_MANAGE_PERMISSION,
  SETTINGS_MANAGE_PERMISSION,
  SHIPPING_ZONE_MANAGE_PERMISSION,
} from "./types";

/** The API's SettingsManage policy: changes need SETTING.M; SETTING.V alone is read-only. */
export function canManageSettings(user: AccessSubject) {
  return user.permissions.includes(SETTINGS_MANAGE_PERMISSION);
}

/** The API's AreaManage policy: areas need AREA.M; AREA.V alone is read-only. */
export function canManageAreas(user: AccessSubject) {
  return user.permissions.includes(AREA_MANAGE_PERMISSION);
}

/** The API's DivisionManage policy: DIVISION.M; DIVISION.V alone is read-only. */
export function canManageDivisions(user: AccessSubject) {
  return user.permissions.includes(DIVISION_MANAGE_PERMISSION);
}

/** The API's DistrictManage policy: DISTRICT.M; DISTRICT.V alone is read-only. */
export function canManageDistricts(user: AccessSubject) {
  return user.permissions.includes(DISTRICT_MANAGE_PERMISSION);
}

/** The API's ShippingZoneManage policy: SHIPPING_ZONE.M; SHIPPING_ZONE.V alone is read-only. */
export function canManageShippingZones(user: AccessSubject) {
  return user.permissions.includes(SHIPPING_ZONE_MANAGE_PERMISSION);
}
