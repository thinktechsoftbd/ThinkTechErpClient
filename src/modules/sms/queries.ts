import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { smsApi } from "./api";

// Loaded once per request even when several components of a page need them.

/** Bought, allocated and used SMS at a glance (overview and dashboard). */
export const getSmsOverview = cache(() => tryApi(() => smsApi.overview()));

/** Every provider (active and inactive) with its stock, for pickers and filters. */
export const getSmsProviders = cache(() => tryApi(() => smsApi.providers.list()));

/**
 * Every organization with its SMS balance, for pickers and filters. Read from the SMS area, so SMS
 * users need no Organizations permission. The API returns at most 500 per call.
 */
export const getSmsOrganizations = cache(() => tryApi(() => smsApi.organizations.list({ limit: 500, offset: 0 })));
