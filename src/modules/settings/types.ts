// Contract of ThinkTechErpAPI's Settings area (Areas/Settings). Ids are integers; JSON is camelCase.

export const SETTINGS_VIEW_PERMISSION = "SETTING.V";
export const SETTINGS_MANAGE_PERMISSION = "SETTING.M";

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
