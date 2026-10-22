import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { securityApi } from "@/modules/security/api";
import { UserCreateForm } from "@/modules/security/components/user-forms";

export const metadata: Metadata = { title: "New user" };

export default function NewUserPage() {
  return (
    <>
      <PageHeader
        title="New user"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Users", href: "/security/users" },
          { label: "New" },
        ]}
      />
      <Card className="max-w-3xl">
        <CardHeader title="Account" />
        <CardBody>
          <Suspense fallback={<TableSkeleton rows={4} columns={2} />}>
            <NewUserForm />
          </Suspense>
        </CardBody>
      </Card>
    </>
  );
}

async function NewUserForm() {
  const roles = await tryApi(() => securityApi.getRoles());
  if (!roles.ok) return <ApiErrorState error={roles.error} />;
  return <UserCreateForm roles={roles.data} />;
}
