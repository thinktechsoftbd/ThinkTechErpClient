import type { Metadata } from "next";
import { Plus, ShieldCheck } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { securityApi } from "@/modules/security/api";
import { ManageOnly } from "@/modules/security/components/manage-only";
import { RolesTable } from "@/modules/security/components/tables";

export const metadata: Metadata = { title: "Roles" };

export default function RolesPage() {
  return (
    <>
      <PageHeader
        title="Roles"
        description="Roles bundle permissions; users receive every permission of their roles."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Roles" }]}
        actions={
          <Suspense>
            <ManageOnly>
              <LinkButton href="/security/roles/new">
                <Plus className="size-4" aria-hidden /> New role
              </LinkButton>
            </ManageOnly>
          </Suspense>
        }
      />
      <Card>
        <CardHeader title="All roles" />
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <RolesList />
        </Suspense>
      </Card>
    </>
  );
}

async function RolesList() {
  const result = await tryApi(() => securityApi.getRoles());
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0) return <EmptyState icon={ShieldCheck} title="No roles yet" />;
  return <RolesTable roles={[...result.data].sort((a, b) => a.name.localeCompare(b.name))} />;
}
