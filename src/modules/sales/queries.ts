import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { settingsApi } from "@/modules/settings/api";
import { salesApi } from "./api";
import { CUSTOMER_GROUP_LOOKUP_TABLE } from "./types";

/** Customers for pickers and filters (active first), loaded once per request. */
export const getCustomerOptions = cache(() => tryApi(() => salesApi.customers.options({ limit: 500 })));

/** Values of the "Customer Group" lookup list. */
export const getCustomerGroupOptions = cache(() => tryApi(() => settingsApi.getLookupOptions(CUSTOMER_GROUP_LOOKUP_TABLE)));
