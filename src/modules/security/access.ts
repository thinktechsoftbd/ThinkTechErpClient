import { canAccessModule, type AccessSubject } from "@/core/auth/roles";
import { DEPLOYMENT_MANAGE_PERMISSION } from "./deployment-types";
import { deploymentModule } from "./deployment-module";
import { ORGANIZATION_MANAGE_PERMISSION, SECURITY_MANAGE_PERMISSION } from "./types";

/** The API's SecurityManage policy: changes need SECURITY.M; SECURITY.V alone is read-only. */
export function canManageSecurity(user: AccessSubject) {
  return user.permissions.includes(SECURITY_MANAGE_PERMISSION);
}

/** The API's OrganizationManage policy: adding and editing organizations needs ORGANIZATION.M. */
export function canManageOrganizations(user: AccessSubject) {
  return user.permissions.includes(ORGANIZATION_MANAGE_PERMISSION);
}

/** The API's DeploymentView policy (DEPLOYMENT.V or .M): opening the /deployment screens. */
export function canViewDeployments(user: AccessSubject) {
  return canAccessModule(user, deploymentModule);
}

/** The API's DeploymentManage policy: adding, editing and deleting deployments needs DEPLOYMENT.M. */
export function canManageDeployments(user: AccessSubject) {
  return user.permissions.includes(DEPLOYMENT_MANAGE_PERMISSION);
}
