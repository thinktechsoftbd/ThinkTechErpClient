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
