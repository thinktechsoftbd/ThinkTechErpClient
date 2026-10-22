import type { Metadata } from "next";
import { KeyRound, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { securityApi } from "@/modules/security/api";
import { ManageOnly } from "@/modules/security/components/manage-only";
import { PermissionsTable } from "@/modules/security/components/tables";

export const metadata: Metadata = { title: "Permissions" };

export default function PermissionsPage() {
  return (
    <>
      <PageHeader
        title="Permissions"
        description="MODULE.ACTION codes granted through roles or directly to users; they travel in the access token."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Permissions" }]}
        actions={
          <Suspense>
            <ManageOnly>
              <LinkButton href="/security/permissions/new">
                <Plus className="size-4" aria-hidden /> New permission
              </LinkButton>
            </ManageOnly>
          </Suspense>
        }
      />
      <Card>
        <CardHeader title="All permissions" />
        <Suspense fallback={<TableSkeleton columns={3} />}>
          <PermissionsList />
        </Suspense>
      </Card>
    </>
  );
}

async function PermissionsList() {
  const result = await tryApi(() => securityApi.getPermissions());
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0) return <EmptyState icon={KeyRound} title="No permissions yet" />;
  return <PermissionsTable permissions={[...result.data].sort((a, b) => a.code.localeCompare(b.code))} />;
}
