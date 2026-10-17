import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { StatusBadge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDateTime } from "@/core/utils/format";
import { decodeParam } from "@/core/utils/params";
import { securityApi } from "@/modules/security/api";
import { knownRoleNames } from "@/modules/security/catalog";
import { PasswordResetForm, UserEditForm } from "@/modules/security/components/forms";
import { SecurityEndpointHint } from "@/modules/security/components/missing-endpoint";

export const metadata: Metadata = { title: "User" };

type Props = PageProps<"/security/users/[userId]">;

export default function UserPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserDetail params={params} />
    </Suspense>
  );
}

async function UserDetail({ params }: Pick<Props, "params">) {
  const userId = decodeParam((await params).userId);
  const [result, roles] = await Promise.all([
    tryApi(() => securityApi.getUser(userId)),
    tryApi(() => securityApi.getRoles()),
  ]);

  if (!result.ok) {
    if (result.error.status === 404 && roles.ok) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} notFoundHint={<SecurityEndpointHint endpoint="GET /api/security/users/{userId}" />} />
      </Card>
    );
  }

  const user = result.data;
  const roleNames = [...new Set([...knownRoleNames(), ...(roles.ok ? roles.data.map((role) => role.name) : [])])];

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {user.displayName ?? user.userName} <StatusBadge active={user.isActive} />
          </span>
        }
        description={`@${user.userName} · created ${formatDateTime(user.createdAt)} · last sign-in ${formatDateTime(user.lastLoginAt)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Users", href: "/security/users" },
          { label: user.userName },
        ]}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Profile and roles" />
          <CardBody>
            <UserEditForm user={user} roleNames={roleNames} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Reset password" description="Sets a new password for this user." />
          <CardBody>
            <PasswordResetForm userId={user.userId} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
