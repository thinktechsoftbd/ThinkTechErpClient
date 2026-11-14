// Contract of ThinkTechErpAPI's Settings area (Areas/Settings). Ids are integers; JSON is camelCase.

export const SETTINGS_VIEW_PERMISSION = "SETTING.V";
export const SETTINGS_MANAGE_PERMISSION = "SETTING.M";

/** Areas have their own permission pair; the API's AreaView / AreaManage policies check these. */
export const AREA_VIEW_PERMISSION = "AREA.V";
export const AREA_MANAGE_PERMISSION = "AREA.M";

/** The lookup table whose values are the currencies a subscription can be billed in. */
export const CURRENCY_LOOKUP_TABLE = "Currency";

export type LookupTable = {
  id: number;
  name: string;
  isActive: boolean;
  /** Number of values in the table. */
  dataCount: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type LookupTableUpsertRequest = { name: string; isActive: boolean };

export type LookupData = {
  id: number;
  lookupTableId: number;
  lookupTableName: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type LookupDataUpsertRequest = { lookupTableId: number; name: string; isActive: boolean };

/** An active value of an active lookup table, for drop-downs (GET /api/settings/lookup-options/{table}). */
export type LookupOption = { id: number; name: string };

export const LOOKUP_NAME_MAX_LENGTH = 150;

// ---- Areas (Areas/Settings → SettingAreaController)

export const AREA_TYPES = [
  { value: "upazila", label: "Upazila" },
  { value: "thana", label: "Thana" },
  { value: "city_area", label: "City area" },
] as const;

export type AreaType = (typeof AREA_TYPES)[number]["value"];

export const AREA_NAME_MAX_LENGTH = 150;

export type Area = {
  id: number;
  objectId: string;
  districtId: number;
  districtName: string;
  divisionId: number;
  divisionName: string;
  name: string;
  nameBn: string | null;
  areaType: AreaType;
  /** Overrides the district's zone (e.g. Savar is a Dhaka suburb). */
  shippingZoneId: number | null;
  shippingZoneName: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type AreaUpsertRequest = {
  districtId: number;
  name: string;
  nameBn: string | null;
  areaType: AreaType;
  shippingZoneId: number | null;
  isActive: boolean;
};

/** A district for the picker and filter (GET /api/settings/areas/districts). */
export type DistrictOption = {
  id: number;
  name: string;
  divisionName: string;
  /** The district's own zone; an area without one falls back to it. */
  shippingZoneId: number | null;
  shippingZoneName: string | null;
};

/** An active shipping zone an area can be set to (GET /api/settings/areas/shipping-zones). */
export type ShippingZoneOption = { id: number; code: string; name: string };

export function areaTypeLabel(value: string) {
  return AREA_TYPES.find((type) => type.value === value)?.label ?? value;
}
