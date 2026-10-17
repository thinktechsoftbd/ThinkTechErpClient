import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ConfirmActionButton } from "@/core/forms/confirm-action-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { decodeParam } from "@/core/utils/params";
import { deleteRoleAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { RoleForm } from "@/modules/security/components/forms";
import { SecurityEndpointHint } from "@/modules/security/components/missing-endpoint";

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
  const roleId = decodeParam((await params).roleId);
  const result = await tryApi(() => securityApi.getRole(roleId));
  if (!result.ok) {
    if (result.error.status === 404) {
      // Distinguish "role not found" from "endpoint not implemented".
      const list = await tryApi(() => securityApi.getRoles());
      if (list.ok) notFound();
    }
    return (
      <Card>
        <ApiErrorState error={result.error} notFoundHint={<SecurityEndpointHint endpoint="GET /api/security/roles/{roleId}" />} />
      </Card>
    );
  }

  const role = result.data;
  return (
    <>
      <PageHeader
        title={<span className="font-mono">{role.name}</span>}
        description={role.description ?? undefined}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Roles", href: "/security/roles" },
          { label: role.name },
        ]}
        actions={
          !role.isSystem && (
            <ConfirmActionButton
              action={deleteRoleAction.bind(null, role.roleId)}
              confirmMessage={`Delete the role "${role.name}"? Users holding it will lose its permissions.`}
            >
              <Trash2 className="size-4" aria-hidden /> Delete role
            </ConfirmActionButton>
          )
        }
      />
      <Card>
        <CardHeader title="Role" />
        <CardBody>
          <RoleForm role={role} />
        </CardBody>
      </Card>
    </>
  );
}
