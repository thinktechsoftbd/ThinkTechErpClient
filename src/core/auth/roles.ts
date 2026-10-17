/** Role that grants access to every module. */
export const SUPER_ADMIN_ROLE = "admin";

export function hasAnyRole(userRoles: readonly string[], required?: readonly string[]) {
  if (!required || required.length === 0) return true;
  if (userRoles.includes(SUPER_ADMIN_ROLE)) return true;
  return required.some((role) => userRoles.includes(role));
}
