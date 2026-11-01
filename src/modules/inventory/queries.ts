import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { settingsApi } from "@/modules/settings/api";
import { CURRENCY_LOOKUP_TABLE } from "@/modules/settings/types";
import { inventoryApi } from "./api";

// Loaded once per request even when several components of a page need them.

/** Units, categories, brands, warehouses and tax groups of the current organization. */
export const getInventoryOptions = cache(() => tryApi(() => inventoryApi.getOptions()));

/** The organization's inventory settings (defaults until saved). */
export const getInventorySettings = cache(() => tryApi(() => inventoryApi.getSettings()));

/** Active currencies (lookup "Currency"). */
export const getCurrencyOptions = cache(() => tryApi(() => settingsApi.getLookupOptions(CURRENCY_LOOKUP_TABLE)));
