import { SUPER_ADMIN_ROLE } from "@/core/auth/roles";
import { modules } from "@/modules/registry";

/** Roles the client already knows about: the super role plus every module's roles. */
export function knownRoleNames() {
  const names = new Set<string>([SUPER_ADMIN_ROLE]);
  for (const definition of modules) definition.roles?.forEach((role) => names.add(role));
  // Used by the API's SmsClientOrAdmin policy for client-scoped tokens.
  names.add("sms_client");
  return [...names];
}

/** Permissions grouped by module, for the role editor. */
export function permissionCatalog() {
  return modules.map((module) => ({
    moduleKey: module.key,
    moduleName: module.name,
    status: module.status,
    permissions: module.permissions,
  }));
}
