import "server-only";
import { apiFetch } from "@/core/api/client";
import type {
  DeploymentInfo,
  DeploymentOrganization,
  DeploymentServiceType,
  DeploymentUpsertRequest,
  OrganizationDeployments,
} from "./deployment-types";
import type { PagedResult } from "./types";

const base = "/api/security/deployments";

export const deploymentApi = {
  /** Every organization (search by name, code or slug) with how many deployments it has. */
  organizations: (query: { search?: string; limit: number; offset: number }) =>
    apiFetch<PagedResult<DeploymentOrganization>>(base, { query }),
  /** The "Service Type" lookup list, inactive values included. */
  serviceTypes: () => apiFetch<DeploymentServiceType[]>(`${base}/service-types`),
  /** An organization and its deployments. */
  forOrganization: (organizationObjectId: string) =>
    apiFetch<OrganizationDeployments>(`${base}/organizations/${organizationObjectId}`),
  create: (organizationObjectId: string, body: DeploymentUpsertRequest) =>
    apiFetch<DeploymentInfo>(`${base}/organizations/${organizationObjectId}`, { method: "POST", body }),
  update: (deploymentId: number, body: DeploymentUpsertRequest) =>
    apiFetch<DeploymentInfo>(`${base}/${deploymentId}`, { method: "PUT", body }),
  remove: (deploymentId: number) => apiFetch<void>(`${base}/${deploymentId}`, { method: "DELETE" }),
};
