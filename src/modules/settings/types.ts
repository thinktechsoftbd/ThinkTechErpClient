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

// ---- Divisions, districts and shipping zones (SettingDivision/District/ShippingZoneController)

/** Each screen has its own permission pair, like Areas. */
export const DIVISION_VIEW_PERMISSION = "DIVISION.V";
export const DIVISION_MANAGE_PERMISSION = "DIVISION.M";
export const DISTRICT_VIEW_PERMISSION = "DISTRICT.V";
export const DISTRICT_MANAGE_PERMISSION = "DISTRICT.M";
export const SHIPPING_ZONE_VIEW_PERMISSION = "SHIPPING_ZONE.V";
export const SHIPPING_ZONE_MANAGE_PERMISSION = "SHIPPING_ZONE.M";

/** Rows per page on the Divisions, Districts and Shipping Zones lists. */
export const LOCATION_PAGE_SIZE = 50;

export const LOCATION_NAME_MAX_LENGTH = 150;
export const SHIPPING_ZONE_CODE_MAX_LENGTH = 50;
export const SHIPPING_ZONE_MAX_DELIVERY_DAYS = 365;
/** Lowercase words joined by underscores, like inside_dhaka (the API's ShippingZoneRules.CodePattern). */
export const SHIPPING_ZONE_CODE_PATTERN = /^[a-z0-9]+(_[a-z0-9]+)*$/;

export type Division = {
  id: number;
  objectId: string;
  name: string;
  nameBn: string | null;
  isActive: boolean;
  /** Districts in the division; one with districts can't be deleted. */
  districtCount: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type DivisionUpsertRequest = { name: string; nameBn: string | null; isActive: boolean };

export type District = {
  id: number;
  objectId: string;
  divisionId: number;
  divisionName: string;
  name: string;
  nameBn: string | null;
  /** The zone its areas use unless they override it. */
  shippingZoneId: number | null;
  shippingZoneName: string | null;
  isActive: boolean;
  areaCount: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type DistrictUpsertRequest = {
  divisionId: number;
  name: string;
  nameBn: string | null;
  shippingZoneId: number | null;
  isActive: boolean;
};

/** Every division, inactive ones flagged (GET /api/settings/districts/divisions). */
export type DivisionOption = { id: number; name: string; isActive: boolean };

/** Every shipping zone, inactive ones flagged (GET /api/settings/districts/shipping-zones). */
export type DistrictZoneOption = ShippingZoneOption & { isActive: boolean };

export type ShippingZone = {
  id: number;
  objectId: string;
  code: string;
  name: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  isActive: boolean;
  /** Districts whose zone this is. */
  districtCount: number;
  /** Areas that override their district's zone with this one. */
  areaCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ShippingZoneUpsertRequest = {
  code: string;
  name: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  isActive: boolean;
};

/** "1–2 days", "Up to 5 days", "From 2 days" or null when neither is set. */
export function deliveryDaysLabel(min: number | null, max: number | null) {
  const days = (value: number) => `${value} day${value === 1 ? "" : "s"}`;
  if (min !== null && max !== null) return min === max ? days(min) : `${min}–${days(max)}`;
  if (max !== null) return `Up to ${days(max)}`;
  if (min !== null) return `From ${days(min)}`;
  return null;
}
