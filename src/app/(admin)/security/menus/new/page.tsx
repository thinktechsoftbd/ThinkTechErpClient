import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { securityApi } from "@/modules/security/api";
import { MenuForm } from "@/modules/security/components/menu-form";

export const metadata: Metadata = { title: "New menu" };

export default function NewMenuPage({ searchParams }: PageProps<"/security/menus/new">) {
  return (
    <>
      <PageHeader
        title="New menu"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Menus", href: "/security/menus" },
          { label: "New" },
        ]}
      />
      <Card className="max-w-4xl">
        <CardHeader title="Menu" />
        <CardBody>
          <Suspense fallback={<TableSkeleton rows={4} columns={2} />}>
            <NewMenuForm searchParams={searchParams} />
          </Suspense>
        </CardBody>
      </Card>
    </>
  );
}

async function NewMenuForm({ searchParams }: Pick<PageProps<"/security/menus/new">, "searchParams">) {
  const parentParam = firstParam((await searchParams).parentId);
  const [menus, roles] = await Promise.all([tryApi(() => securityApi.getMenus()), tryApi(() => securityApi.getRoles())]);
  if (!menus.ok) return <ApiErrorState error={menus.error} />;
  if (!roles.ok) return <ApiErrorState error={roles.error} />;
  return (
    <MenuForm
      menus={menus.data}
      roles={roles.data}
      defaultParentId={parentParam ? parseIdParam(parentParam) : null}
    />
  );
}
