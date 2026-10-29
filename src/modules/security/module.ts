import { ShieldCheck } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { SECURITY_MANAGE_PERMISSION, SECURITY_VIEW_PERMISSION } from "./types";

export const securityModule = defineModule({
  key: "security",
  name: "Security",
  description: "Organizations, users, roles and permissions for every ERP module.",
  icon: ShieldCheck,
  basePath: "/security",
  status: "active",
  roles: ["security_admin"],
  // The API's SecurityView / SecurityManage policies check these permission codes.
  accessPermissions: [SECURITY_VIEW_PERMISSION, SECURITY_MANAGE_PERMISSION],
  nav: [
    { label: "Overview", href: "/security", exact: true },
    { label: "Organizations", href: "/security/organizations" },
    { label: "Users", href: "/security/users" },
    { label: "Roles", href: "/security/roles" },
    { label: "Permissions", href: "/security/permissions" },
    { label: "Menus", href: "/security/menus" },
    { label: "Subscription Modules", href: "/security/subscription-modules" },
    { label: "Subscriptions", href: "/security/subscriptions" },
  ],
  permissions: [
    { key: SECURITY_VIEW_PERMISSION, label: "View organizations, users, roles and permissions" },
    { key: SECURITY_MANAGE_PERMISSION, label: "Create and edit them" },
  ],
});
