import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { securityApi } from "@/modules/security/api";
import { knownRoleNames } from "@/modules/security/catalog";
import { UserCreateForm } from "@/modules/security/components/forms";

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
  const roleNames = [...new Set([...knownRoleNames(), ...(roles.ok ? roles.data.map((role) => role.name) : [])])];
  return <UserCreateForm roleNames={roleNames} />;
}
