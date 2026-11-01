import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { settingsApi } from "@/modules/settings/api";
import { purchaseApi } from "./api";
import { SUPPLIER_GROUP_LOOKUP_TABLE } from "./types";

/** Suppliers for pickers (active first), loaded once per request. */
export const getSupplierOptions = cache(() => tryApi(() => purchaseApi.suppliers.options(undefined, 500)));

/** Values of the "Supplier Group" lookup list. */
export const getSupplierGroupOptions = cache(() => tryApi(() => settingsApi.getLookupOptions(SUPPLIER_GROUP_LOOKUP_TABLE)));

/** Every tax rate (for the tax group editor). */
export const getAllTaxRates = cache(() => tryApi(async () => (await purchaseApi.taxRates.list({ limit: 500, offset: 0 })).items));
