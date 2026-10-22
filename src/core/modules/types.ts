import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  /** Match only the exact path (used for module overview links). */
  exact?: boolean;
};

export type PermissionDefinition = {
  key: string;
  label: string;
};

export type ModuleStatus = "active" | "planned";

/**
 * Every ERP module describes itself with one of these. The shell (sidebar,
 * dashboard, role editor) is built from the registry, so adding a module
 * means adding a definition plus its route folder under app/(admin).
 */
export type ModuleDefinition = {
  key: string;
  name: string;
  description: string;
  icon: LucideIcon;
  /** Route prefix owned by the module, e.g. "/sms". */
  basePath: string;
  status: ModuleStatus;
  /** Roles allowed to use the module. Omit (with accessPermissions) for any signed-in user. */
  roles?: readonly string[];
  /** API permission codes that also grant access (any one), e.g. "SECURITY.V". */
  accessPermissions?: readonly string[];
  nav: readonly NavItem[];
  /** Permission keys the module exposes to the role editor. */
  permissions: readonly PermissionDefinition[];
};

export function defineModule(definition: ModuleDefinition): ModuleDefinition {
  return definition;
}
