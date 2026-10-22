import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { securityApi } from "@/modules/security/api";
import { RoleForm } from "@/modules/security/components/forms";

export const metadata: Metadata = { title: "New role" };

export default function NewRolePage() {
  return (
    <>
      <PageHeader
        title="New role"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Roles", href: "/security/roles" },
          { label: "New" },
        ]}
      />
      <Card>
        <CardHeader title="Role" description="Permissions are grouped by the module part of their code." />
        <CardBody>
          <Suspense fallback={<TableSkeleton rows={4} columns={2} />}>
            <NewRoleForm />
          </Suspense>
        </CardBody>
      </Card>
    </>
  );
}

async function NewRoleForm() {
  const permissions = await tryApi(() => securityApi.getPermissions());
  if (!permissions.ok) return <ApiErrorState error={permissions.error} />;
  return <RoleForm permissions={permissions.data} />;
}
