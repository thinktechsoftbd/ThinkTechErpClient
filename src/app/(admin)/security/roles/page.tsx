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
import { SecurityEndpointHint } from "@/modules/security/components/missing-endpoint";
import { RolesTable } from "@/modules/security/components/tables";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage() {
  return (
    <>
      <PageHeader
        title="Roles"
        description="Roles are issued in the access token's role claim and grant module permissions."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Roles" }]}
        actions={
          <LinkButton href="/security/roles/new">
            <Plus className="size-4" aria-hidden /> New role
          </LinkButton>
        }
      />
      <Card>
        <CardHeader title="All roles" />
        <Suspense fallback={<TableSkeleton />}>
          <RolesList />
        </Suspense>
      </Card>
    </>
  );
}

async function RolesList() {
  const result = await tryApi(() => securityApi.getRoles());
  if (!result.ok) {
    return <ApiErrorState error={result.error} notFoundHint={<SecurityEndpointHint endpoint="GET /api/security/roles" />} />;
  }
  if (result.data.length === 0) {
    return (
      <EmptyState
        icon={KeyRound}
        title="No roles yet"
        action={<LinkButton href="/security/roles/new">New role</LinkButton>}
      />
    );
  }
  return <RolesTable roles={result.data} />;
}
