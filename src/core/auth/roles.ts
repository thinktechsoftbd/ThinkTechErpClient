/** Role that grants access to every module. */
export const SUPER_ADMIN_ROLE = "admin";

export function hasAnyRole(userRoles: readonly string[], required?: readonly string[]) {
  if (!required || required.length === 0) return true;
  if (userRoles.includes(SUPER_ADMIN_ROLE)) return true;
  return required.some((role) => userRoles.includes(role));
}

export type AccessSubject = { roles: readonly string[]; permissions: readonly string[] };

/**
 * Whether a user may open a module: any of its roles, or any of its access permissions
 * (codes from the token's `permission` claim, as the API checks them). A module that
 * declares neither is open to every signed-in user.
 */
export function canAccessModule(
  user: AccessSubject,
  module: { roles?: readonly string[]; accessPermissions?: readonly string[] },
) {
  const roles = module.roles ?? [];
  const permissions = module.accessPermissions ?? [];
  if (roles.length === 0 && permissions.length === 0) return true;
  if (user.roles.includes(SUPER_ADMIN_ROLE)) return true;
  return roles.some((role) => user.roles.includes(role)) || permissions.some((code) => user.permissions.includes(code));
}
