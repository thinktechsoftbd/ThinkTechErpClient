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
import { parseIdParam } from "@/core/utils/params";
import { canManageSecurity } from "@/modules/security/access";
import { deletePermissionAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { PermissionForm } from "@/modules/security/components/forms";

export const metadata: Metadata = { title: "Permission" };

type Props = PageProps<"/security/permissions/[permissionId]">;

export default function PermissionPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PermissionDetail params={params} />
    </Suspense>
  );
}

async function PermissionDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).permissionId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => securityApi.getPermission(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }

  const permission = result.data;
  const canManage = canManageSecurity(session);
  return (
    <>
      <PageHeader
        title={<span className="font-mono">{permission.code}</span>}
        description={permission.name}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Permissions", href: "/security/permissions" },
          { label: permission.code },
        ]}
        actions={
          canManage && (
            <ConfirmActionButton
              action={deletePermissionAction.bind(null, permission.id)}
              confirmMessage={`Delete the permission ${permission.code}? This only works while no role or user holds it.`}
            >
              <Trash2 className="size-4" aria-hidden /> Delete permission
            </ConfirmActionButton>
          )
        }
      />
      <Card className="max-w-3xl">
        <CardHeader title="Permission" />
        <CardBody>
          <PermissionForm permission={permission} readOnly={!canManage} />
        </CardBody>
      </Card>
    </>
  );
}
