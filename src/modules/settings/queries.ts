import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { settingsApi } from "./api";

/** Largest page the API allows. */
const MAX_LIMIT = 500;

/**
 * Every lookup table (for pickers and filters), loaded once per request even when
 * several components on the page need it.
 */
export const getAllLookupTables = cache(() =>
  tryApi(async () => (await settingsApi.getLookupTables({ limit: MAX_LIMIT, offset: 0 })).items),
);

/** Every district (for the Area picker and filter); a single page, as there are well under 500. */
export const getAllDistricts = cache(() =>
  tryApi(async () => (await settingsApi.getDistricts({ limit: MAX_LIMIT, offset: 0 })).items),
);

/** The active shipping zones an area can override its district's zone with. */
export const getShippingZones = cache(() => tryApi(() => settingsApi.getShippingZones()));
