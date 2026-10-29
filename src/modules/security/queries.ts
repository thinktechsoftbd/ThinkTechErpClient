import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { settingsApi } from "@/modules/settings/api";
import { CURRENCY_LOOKUP_TABLE } from "@/modules/settings/types";
import { securityApi } from "./api";
import type { PickerOption } from "./components/subscription-fields";

/** Largest page the API allows. */
const MAX_LIMIT = 500;

// Picker options for the subscription screens, loaded once per request even when the
// toolbar, the "New" button and every row's edit modal need them.

export const getOrganizationOptions = cache(() =>
  tryApi(async (): Promise<PickerOption[]> =>
    (await securityApi.getOrganizations())
      .map((organization) => ({ id: organization.id, name: organization.nameEn, isActive: organization.isActive }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ),
);

export const getSubscriptionModuleOptions = cache(() =>
  tryApi(async (): Promise<PickerOption[]> =>
    (await securityApi.getSubscriptionModules({ limit: MAX_LIMIT, offset: 0 })).items
      .map((module) => ({ id: module.id, name: module.moduleName, isActive: module.isActive }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  ),
);

/** Active values of the "Currency" lookup table. */
export const getCurrencyOptions = cache(() => tryApi(() => settingsApi.getLookupOptions(CURRENCY_LOOKUP_TABLE)));
