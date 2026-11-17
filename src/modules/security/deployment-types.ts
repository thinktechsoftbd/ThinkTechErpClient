// ThinkTechErpAPI's deployment information (Areas/Security/Controller/SecurityDeploymentsController.cs,
// api/security/deployments): what is deployed for each organization, by service type, with detail lines.

export const DEPLOYMENT_VIEW_PERMISSION = "DEPLOYMENT.V";
export const DEPLOYMENT_MANAGE_PERMISSION = "DEPLOYMENT.M";

export const DEPLOYMENT_REMARKS_MAX_LENGTH = 1000;
export const DEPLOYMENT_DESCRIPTION_MAX_LENGTH = 4000;
export const DEPLOYMENT_MAX_DESCRIPTIONS = 50;
export const DEPLOYMENT_PAGE_SIZE = 50;

/** A value of the "Service Type" lookup list (Settings → Lookup Data). */
export type DeploymentServiceType = { id: number; name: string; isActive: boolean };

export type DeploymentInfoDetail = { id: number; description: string };

/** A deployed service of an organization. Dates are UTC ISO strings. */
export type DeploymentInfo = {
  id: number;
  objectId: string;
  organizationObjectId: string;
  serviceTypeId: number;
  serviceType: string;
  isActive: boolean;
  remarks: string | null;
  /** In the order they were entered. */
  details: DeploymentInfoDetail[];
  createdDate: string;
  createdById: number | null;
  createdByName: string | null;
  updatedDate: string | null;
  updatedById: number | null;
  updatedByName: string | null;
};

/** An organization on the deployment screens, with how many deployments it has. */
export type DeploymentOrganization = {
  objectId: string;
  id: number;
  name: string;
  code: string | null;
  slug: string | null;
  isActive: boolean;
  isExternal: boolean;
  deploymentCount: number;
  activeDeploymentCount: number;
  lastChangedDate: string | null;
};

export type OrganizationDeployments = { organization: DeploymentOrganization; deployments: DeploymentInfo[] };

export type DeploymentUpsertRequest = {
  serviceTypeId: number;
  isActive: boolean;
  remarks: string | null;
  /** Replaces the deployment's lines, in this order. */
  details: { description: string }[];
};

/** "M/S Akhi Enterprise" -> "m-s-akhi-enterprise": the slug part of the address when an organization has none. */
function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "organization"
  );
}

/** The organization's slug, or one made from its name. */
export function deploymentSlug(organization: { slug: string | null; name: string }) {
  return organization.slug?.trim() || slugify(organization.name);
}

/** An organization's deployment page: /deployment/{object id}/{slug}. */
export function deploymentPath(organization: { objectId: string; slug: string | null; name: string }) {
  return `/deployment/${organization.objectId}/${encodeURIComponent(deploymentSlug(organization))}`;
}
