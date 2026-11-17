import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Server } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { EmptyState, PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManageDeployments } from "@/modules/security/access";
import { DeploymentFields } from "@/modules/security/components/deployments/deployment-fields";
import { DeploymentList } from "@/modules/security/components/deployments/deployment-list";
import { saveDeploymentAction } from "@/modules/security/deployment-actions";
import { deploymentApi } from "@/modules/security/deployment-api";
import { deploymentPath, deploymentSlug } from "@/modules/security/deployment-types";
import { UUID_PATTERN } from "@/modules/security/types";

export const metadata: Metadata = { title: "Deployment" };

type Props = PageProps<"/deployment/[organizationObjectId]/[organizationSlug]">;

export default function OrganizationDeploymentPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrganizationDeployment params={params} />
    </Suspense>
  );
}

async function OrganizationDeployment({ params }: Pick<Props, "params">) {
  const { organizationObjectId, organizationSlug } = await params;
  if (!UUID_PATTERN.test(organizationObjectId)) notFound();

  const [session, result, serviceTypes] = await Promise.all([
    requireSession(),
    tryApi(() => deploymentApi.forOrganization(organizationObjectId)),
    tryApi(() => deploymentApi.serviceTypes()),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const { organization, deployments } = result.data;
  // The slug only makes the address readable; a wrong or old one goes to the organization's current address.
  if (decodeURIComponent(organizationSlug) !== deploymentSlug(organization)) redirect(deploymentPath(organization));

  const canManage = canManageDeployments(session);
  const types = serviceTypes.ok ? serviceTypes.data : [];
  const newDeployment = canManage ? (
    <FormModalButton
      mode="create"
      label="New deployment"
      title="New deployment"
      description={organization.name}
      action={saveDeploymentAction.bind(null, organization.objectId, null)}
      submitLabel="Add deployment"
      size="lg"
    >
      <DeploymentFields serviceTypes={types} />
    </FormModalButton>
  ) : null;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {organization.name}
            {organization.isExternal && <Badge tone="warning">External</Badge>}
            {!organization.isActive && <Badge tone="gray">Inactive</Badge>}
          </span>
        }
        description={`What is deployed for ${organization.name}${organization.code ? ` (${organization.code})` : ""}, by service type.`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Deployment", href: "/deployment" },
          { label: organization.name },
        ]}
        actions={newDeployment}
      />
      {deployments.length === 0 ? (
        <Card>
          <EmptyState
            icon={Server}
            title="No deployments yet"
            description={canManage ? "Add what is deployed for this organization with New deployment." : undefined}
          />
        </Card>
      ) : (
        <DeploymentList deployments={deployments} serviceTypes={types} canManage={canManage} />
      )}
    </>
  );
}
