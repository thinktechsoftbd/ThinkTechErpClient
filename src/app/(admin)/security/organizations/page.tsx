import type { Metadata } from "next";
import { Building2, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { securityApi } from "@/modules/security/api";
import { PermissionOnly } from "@/core/crud/permission-only";
import { OrganizationsTable } from "@/modules/security/components/tables";
import { ORGANIZATION_MANAGE_PERMISSION } from "@/modules/security/types";

export const metadata: Metadata = { title: "Organizations" };

export default function OrganizationsPage() {
  return (
    <>
      <PageHeader
        title="Organizations"
        description="Companies and branches using the ERP."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Organizations" }]}
        actions={
          <Suspense>
            <PermissionOnly code={ORGANIZATION_MANAGE_PERMISSION}>
              <LinkButton href="/security/organizations/new">
                <Plus className="size-4" aria-hidden /> New organization
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <CardHeader title="All organizations" />
        <Suspense fallback={<TableSkeleton />}>
          <OrganizationsList />
        </Suspense>
      </Card>
    </>
  );
}

async function OrganizationsList() {
  const result = await tryApi(() => securityApi.getOrganizations());
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0) return <EmptyState icon={Building2} title="No organizations yet" />;
  return <OrganizationsTable organizations={result.data} />;
}
