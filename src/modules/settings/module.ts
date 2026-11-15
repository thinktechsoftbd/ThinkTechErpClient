import { Settings } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import {
  AREA_MANAGE_PERMISSION,
  AREA_VIEW_PERMISSION,
  DISTRICT_MANAGE_PERMISSION,
  DISTRICT_VIEW_PERMISSION,
  DIVISION_MANAGE_PERMISSION,
  DIVISION_VIEW_PERMISSION,
  SETTINGS_MANAGE_PERMISSION,
  SETTINGS_VIEW_PERMISSION,
  SHIPPING_ZONE_MANAGE_PERMISSION,
  SHIPPING_ZONE_VIEW_PERMISSION,
} from "./types";

export const settingsModule = defineModule({
  key: "settings",
  name: "Settings",
  description:
    "Lookup tables and their values, plus divisions, districts, delivery areas and shipping zones, shared by every module (e.g. currencies).",
  icon: Settings,
  basePath: "/settings",
  status: "active",
  // The API's SettingsView / SettingsManage policies and each location screen's View / Manage pair
  // check these permission codes; any one opens the module.
  accessPermissions: [
    SETTINGS_VIEW_PERMISSION,
    SETTINGS_MANAGE_PERMISSION,
    AREA_VIEW_PERMISSION,
    AREA_MANAGE_PERMISSION,
    DIVISION_VIEW_PERMISSION,
    DIVISION_MANAGE_PERMISSION,
    DISTRICT_VIEW_PERMISSION,
    DISTRICT_MANAGE_PERMISSION,
    SHIPPING_ZONE_VIEW_PERMISSION,
    SHIPPING_ZONE_MANAGE_PERMISSION,
  ],
  nav: [
    { label: "Overview", href: "/settings", exact: true },
    { label: "Lookup Tables", href: "/settings/lookup-tables" },
    { label: "Lookup Data", href: "/settings/lookup-data" },
    { label: "Areas", href: "/settings/areas" },
    { label: "Divisions", href: "/settings/divisions" },
    { label: "Districts", href: "/settings/districts" },
    { label: "Shipping Zones", href: "/settings/shipping-zones" },
  ],
  permissions: [
    { key: SETTINGS_VIEW_PERMISSION, label: "View lookup tables and lookup data" },
    { key: SETTINGS_MANAGE_PERMISSION, label: "Add, edit and delete them" },
    { key: AREA_VIEW_PERMISSION, label: "View areas" },
    { key: AREA_MANAGE_PERMISSION, label: "Add, edit and delete areas" },
    { key: DIVISION_VIEW_PERMISSION, label: "View divisions" },
    { key: DIVISION_MANAGE_PERMISSION, label: "Add, edit and delete divisions" },
    { key: DISTRICT_VIEW_PERMISSION, label: "View districts" },
    { key: DISTRICT_MANAGE_PERMISSION, label: "Add, edit and delete districts" },
    { key: SHIPPING_ZONE_VIEW_PERMISSION, label: "View shipping zones" },
    { key: SHIPPING_ZONE_MANAGE_PERMISSION, label: "Add, edit and delete shipping zones" },
  ],
});
