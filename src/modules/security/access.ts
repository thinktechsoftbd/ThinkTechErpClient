import type { AccessSubject } from "@/core/auth/roles";
import { ORGANIZATION_MANAGE_PERMISSION, SECURITY_MANAGE_PERMISSION } from "./types";

/** The API's SecurityManage policy: changes need SECURITY.M; SECURITY.V alone is read-only. */
export function canManageSecurity(user: AccessSubject) {
  return user.permissions.includes(SECURITY_MANAGE_PERMISSION);
}

/** The API's OrganizationManage policy: adding and editing organizations needs ORGANIZATION.M. */
export function canManageOrganizations(user: AccessSubject) {
  return user.permissions.includes(ORGANIZATION_MANAGE_PERMISSION);
}
