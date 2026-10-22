import type { Metadata } from "next";
import { ListTree, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManageSecurity } from "@/modules/security/access";
import { securityApi } from "@/modules/security/api";
import { ManageOnly } from "@/modules/security/components/manage-only";
import { MenusTable } from "@/modules/security/components/menus-table";

export const metadata: Metadata = { title: "Menus" };

export default function MenusPage() {
  return (
    <>
      <PageHeader
        title="Menus"
        description="The sidebar menu tree. Each user sees the active menus for their roles, plus any granted under Users → Menu access."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Menus" }]}
        actions={
          <Suspense>
            <ManageOnly>
              <LinkButton href="/security/menus/new">
                <Plus className="size-4" aria-hidden /> New menu
              </LinkButton>
            </ManageOnly>
          </Suspense>
        }
      />
      <Card>
        <CardHeader title="All menus" description="In sidebar order. Inactive menus are hidden from everyone." />
        <Suspense fallback={<TableSkeleton columns={5} />}>
          <MenusList />
        </Suspense>
      </Card>
    </>
  );
}

async function MenusList() {
  const [session, menus, roles] = await Promise.all([
    requireSession(),
    tryApi(() => securityApi.getMenus()),
    tryApi(() => securityApi.getRoles()),
  ]);
  if (!menus.ok) return <ApiErrorState error={menus.error} />;
  if (menus.data.length === 0) {
    return <EmptyState icon={ListTree} title="No menus yet" />;
  }
  return <MenusTable menus={menus.data} roles={roles.ok ? roles.data : []} canManage={canManageSecurity(session)} />;
}
