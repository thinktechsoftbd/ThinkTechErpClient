import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ConfirmActionButton } from "@/core/forms/confirm-action-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { parseIdParam } from "@/core/utils/params";
import { canManageSecurity } from "@/modules/security/access";
import { deleteMenuAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { MenuForm } from "@/modules/security/components/menu-form";
import { MenusTable } from "@/modules/security/components/menus-table";

export const metadata: Metadata = { title: "Menu" };

type Props = PageProps<"/security/menus/[menuId]">;

export default function MenuPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MenuDetail params={params} />
    </Suspense>
  );
}

async function MenuDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).menuId);
  if (id === null) notFound();
  const [session, result, menus, roles] = await Promise.all([
    requireSession(),
    tryApi(() => securityApi.getMenu(id)),
    tryApi(() => securityApi.getMenus()),
    tryApi(() => securityApi.getRoles()),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  if (!menus.ok) {
    return (
      <Card>
        <ApiErrorState error={menus.error} />
      </Card>
    );
  }
  if (!roles.ok) {
    return (
      <Card>
        <ApiErrorState error={roles.error} />
      </Card>
    );
  }

  const menu = result.data;
  const canManage = canManageSecurity(session);
  const submenus = menus.data.filter((item) => item.parentId === menu.id);
  const parent = menus.data.find((item) => item.id === menu.parentId);

  return (
    <>
      <PageHeader
        title={menu.title}
        description={`${parent ? `Under ${parent.title} · ` : "Top-level menu · "}${submenus.length} submenu(s)`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Menus", href: "/security/menus" },
          { label: menu.title },
        ]}
        actions={
          canManage && (
            <>
              <LinkButton href={`/security/menus/new?parentId=${menu.id}`} variant="outline">
                <Plus className="size-4" aria-hidden /> Add submenu
              </LinkButton>
              <ConfirmActionButton
                action={deleteMenuAction.bind(null, menu.id)}
                confirmMessage={`Delete the menu "${menu.title}"? Menus that still have submenus can't be deleted.`}
              >
                <Trash2 className="size-4" aria-hidden /> Delete menu
              </ConfirmActionButton>
            </>
          )
        }
      />
      <Card className="max-w-4xl">
        <CardHeader title="Menu" />
        <CardBody>
          <MenuForm menu={menu} menus={menus.data} roles={roles.data} readOnly={!canManage} />
        </CardBody>
      </Card>
      {submenus.length > 0 && (
        <Card className="mt-6 max-w-4xl">
          <CardHeader title="Submenus" />
          <MenusTable menus={submenus.map((item) => ({ ...item, parentId: null }))} roles={roles.data} canManage={canManage} />
        </Card>
      )}
    </>
  );
}
