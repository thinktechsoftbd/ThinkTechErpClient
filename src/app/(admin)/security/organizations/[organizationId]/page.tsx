import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { CopyButton } from "@/core/ui/copy-button";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDateTime } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { canManageOrganizations } from "@/modules/security/access";
import { securityApi } from "@/modules/security/api";
import { OrganizationForm } from "@/modules/security/components/forms";

export const metadata: Metadata = { title: "Organization" };

type Props = PageProps<"/security/organizations/[organizationId]">;

export default function OrganizationPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrganizationDetail params={params} />
    </Suspense>
  );
}

async function OrganizationDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).organizationId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => securityApi.getOrganization(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }

  const organization = result.data;
  const updated = organization.updatedAt ? ` · updated ${formatDateTime(organization.updatedAt)}` : "";
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {organization.nameEn} <StatusBadge active={organization.isActive} />
            {organization.isExternal && <Badge tone="warning">External</Badge>}
          </span>
        }
        description={
          <span className="flex flex-col gap-1">
            <span>{`${organization.code ? `${organization.code} · ` : ""}created ${formatDateTime(organization.createdAt)}${updated}`}</span>
            <span className="flex flex-wrap items-center gap-1">
              Organization Id <code className="font-mono text-xs text-gray-700 dark:text-gray-300">{organization.objectId}</code>
              <CopyButton value={organization.objectId} />
            </span>
          </span>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Organizations", href: "/security/organizations" },
          { label: organization.nameEn },
        ]}
      />
      <Card className="max-w-4xl">
        <CardHeader title="Organization" />
        <CardBody>
          <OrganizationForm organization={organization} readOnly={!canManageOrganizations(session)} />
        </CardBody>
      </Card>
    </>
  );
}
