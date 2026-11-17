import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { deploymentApi } from "@/modules/security/deployment-api";
import { deploymentPath } from "@/modules/security/deployment-types";
import { UUID_PATTERN } from "@/modules/security/types";

type Props = PageProps<"/deployment/[organizationObjectId]">;

/** /deployment/{object id} without the slug: goes to the organization's full deployment address. */
export default function OrganizationDeploymentRedirect({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GoToDeployment params={params} />
    </Suspense>
  );
}

async function GoToDeployment({ params }: Pick<Props, "params">) {
  const { organizationObjectId } = await params;
  if (!UUID_PATTERN.test(organizationObjectId)) notFound();

  const result = await tryApi(() => deploymentApi.forOrganization(organizationObjectId));
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }
  redirect(deploymentPath(result.data.organization));
}
