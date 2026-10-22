import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ConfirmActionButton } from "@/core/forms/confirm-action-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatNumber } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { canManageSecurity } from "@/modules/security/access";
import { deleteRoleAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { RoleForm } from "@/modules/security/components/forms";

export const metadata: Metadata = { title: "Role" };

type Props = PageProps<"/security/roles/[roleId]">;

export default function RolePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <RoleDetail params={params} />
    </Suspense>
  );
}

async function RoleDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).roleId);
  if (id === null) notFound();
  const [session, result, permissions] = await Promise.all([
    requireSession(),
    tryApi(() => securityApi.getRole(id)),
    tryApi(() => securityApi.getPermissions()),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  if (!permissions.ok) {
    return (
      <Card>
        <ApiErrorState error={permissions.error} />
      </Card>
    );
  }

  const role = result.data;
  const canManage = canManageSecurity(session);
  return (
    <>
      <PageHeader
        title={role.name}
        description={`${role.description ? `${role.description} · ` : ""}${formatNumber(role.userCount)} user(s)`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Roles", href: "/security/roles" },
          { label: role.name },
        ]}
        actions={
          canManage && (
            <ConfirmActionButton
              action={deleteRoleAction.bind(null, role.id)}
              confirmMessage={`Delete the role "${role.name}"? This only works while no user holds it.`}
            >
              <Trash2 className="size-4" aria-hidden /> Delete role
            </ConfirmActionButton>
          )
        }
      />
      <Card>
        <CardHeader title="Role" description="Permissions are grouped by the module part of their code." />
        <CardBody>
          <RoleForm role={role} permissions={permissions.data} readOnly={!canManage} />
        </CardBody>
      </Card>
    </>
  );
}
