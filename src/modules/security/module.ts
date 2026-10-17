import { ShieldCheck } from "lucide-react";
import { defineModule } from "@/core/modules/types";

export const securityModule = defineModule({
  key: "security",
  name: "Security",
  description: "Users, roles and access control for every ERP module.",
  icon: ShieldCheck,
  basePath: "/security",
  status: "active",
  roles: ["security_admin"],
  nav: [
    { label: "Overview", href: "/security", exact: true },
    { label: "Users", href: "/security/users" },
    { label: "Roles", href: "/security/roles" },
  ],
  permissions: [
    { key: "security.users.view", label: "View users" },
    { key: "security.users.manage", label: "Create and edit users" },
    { key: "security.roles.view", label: "View roles" },
    { key: "security.roles.manage", label: "Create and edit roles" },
  ],
});
