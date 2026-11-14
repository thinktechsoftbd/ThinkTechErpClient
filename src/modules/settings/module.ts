import { Settings } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import {
  AREA_MANAGE_PERMISSION,
  AREA_VIEW_PERMISSION,
  SETTINGS_MANAGE_PERMISSION,
  SETTINGS_VIEW_PERMISSION,
} from "./types";

export const settingsModule = defineModule({
  key: "settings",
  name: "Settings",
  description: "Lookup tables and their values, plus delivery areas, shared by every module (e.g. currencies).",
  icon: Settings,
  basePath: "/settings",
  status: "active",
  // The API's SettingsView / SettingsManage and AreaView / AreaManage policies check these permission codes.
  accessPermissions: [
    SETTINGS_VIEW_PERMISSION,
    SETTINGS_MANAGE_PERMISSION,
    AREA_VIEW_PERMISSION,
    AREA_MANAGE_PERMISSION,
  ],
  nav: [
    { label: "Overview", href: "/settings", exact: true },
    { label: "Lookup Tables", href: "/settings/lookup-tables" },
    { label: "Lookup Data", href: "/settings/lookup-data" },
    { label: "Areas", href: "/settings/areas" },
  ],
  permissions: [
    { key: SETTINGS_VIEW_PERMISSION, label: "View lookup tables and lookup data" },
    { key: SETTINGS_MANAGE_PERMISSION, label: "Add, edit and delete them" },
    { key: AREA_VIEW_PERMISSION, label: "View areas" },
    { key: AREA_MANAGE_PERMISSION, label: "Add, edit and delete areas" },
  ],
});
