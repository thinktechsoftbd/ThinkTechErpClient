import type { Metadata } from "next";
import { ListTree } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatNumber } from "@/core/utils/format";
import { canManageSecurity } from "@/modules/security/access";
import { createMenuFromListAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { MenuFields } from "@/modules/security/components/menu-form";
import { MenusTable } from "@/modules/security/components/menus-table";

export const metadata: Metadata = { title: "Menus" };

export default function MenusPage() {
  return (
    <>
      <PageHeader
        title="Menus"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Menus" }]}
        actions={
          <Suspense>
            <NewMenuButton />
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <MenusList />
        </Suspense>
      </Card>
    </>
  );
}

/** New menu, in a popup (its parent picker needs every menu). Only for SECURITY.M. */
async function NewMenuButton() {
  const session = await requireSession();
  if (!canManageSecurity(session)) return null;
  const [menus, roles] = await Promise.all([tryApi(() => securityApi.getMenus()), tryApi(() => securityApi.getRoles())]);
  return (
    <FormModalButton
      mode="create"
      label="New menu"
      title="New menu"
      description="A sidebar entry. Each user sees the active menus for their roles, plus any granted under Users → Menu access."
      action={createMenuFromListAction}
      submitLabel="Create menu"
      size="lg"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <MenuFields menus={menus.ok ? menus.data : []} roles={roles.ok ? roles.data : []} />
      </div>
    </FormModalButton>
  );
}

async function MenusList() {
  const [session, menus, roles] = await Promise.all([
    requireSession(),
    tryApi(() => securityApi.getMenus()),
    tryApi(() => securityApi.getRoles()),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {menus.ok ? `${formatNumber(menus.data.length)} menu${menus.data.length === 1 ? "" : "s"}` : "Menus"}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">In sidebar order. Inactive menus are hidden from everyone.</p>
      </div>
      {!menus.ok ? (
        <ApiErrorState error={menus.error} />
      ) : menus.data.length === 0 ? (
        <EmptyState icon={ListTree} title="No menus yet" />
      ) : (
        <MenusTable menus={menus.data} roles={roles.ok ? roles.data : []} canManage={canManageSecurity(session)} />
      )}
    </>
  );
}
