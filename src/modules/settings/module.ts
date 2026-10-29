import { Settings } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { SETTINGS_MANAGE_PERMISSION, SETTINGS_VIEW_PERMISSION } from "./types";

export const settingsModule = defineModule({
  key: "settings",
  name: "Settings",
  description: "Lookup tables and their values, shared by every module (e.g. currencies).",
  icon: Settings,
  basePath: "/settings",
  status: "active",
  // The API's SettingsView / SettingsManage policies check these permission codes.
  accessPermissions: [SETTINGS_VIEW_PERMISSION, SETTINGS_MANAGE_PERMISSION],
  nav: [
    { label: "Overview", href: "/settings", exact: true },
    { label: "Lookup Tables", href: "/settings/lookup-tables" },
    { label: "Lookup Data", href: "/settings/lookup-data" },
  ],
  permissions: [
    { key: SETTINGS_VIEW_PERMISSION, label: "View lookup tables and lookup data" },
    { key: SETTINGS_MANAGE_PERMISSION, label: "Add, edit and delete them" },
  ],
});
