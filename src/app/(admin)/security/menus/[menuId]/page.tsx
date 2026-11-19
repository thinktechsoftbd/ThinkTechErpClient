import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ConfirmActionButton } from "@/core/forms/confirm-action-button";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { parseIdParam } from "@/core/utils/params";
import { canManageSecurity } from "@/modules/security/access";
import { createMenuFromListAction, deleteMenuAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { MenuFields, MenuForm } from "@/modules/security/components/menu-form";
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
        compact
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Menus", href: "/security/menus" },
          { label: menu.title },
        ]}
        actions={
          <>
            <LinkButton href="/security/menus" variant="outline">
              <ArrowLeft className="size-4" aria-hidden /> Back to list
            </LinkButton>
            {canManage && (
              <>
                <FormModalButton
                  mode="create"
                  variant="outline"
                  label="Add submenu"
                  title="New submenu"
                  description={`Under ${menu.title}`}
                  action={createMenuFromListAction}
                  submitLabel="Create menu"
                  size="lg"
                >
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <MenuFields menus={menus.data} roles={roles.data} defaultParentId={menu.id} />
                  </div>
                </FormModalButton>
                <ConfirmActionButton
                  action={deleteMenuAction.bind(null, menu.id)}
                  confirmMessage={`Delete the menu "${menu.title}"? Menus that still have submenus can't be deleted.`}
                >
                  <Trash2 className="size-4" aria-hidden /> Delete menu
                </ConfirmActionButton>
              </>
            )}
          </>
        }
      />
      {/* The menu on the left, its submenus (its whole branch) on the right. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Menu" />
          <CardBody>
            <MenuForm menu={menu} menus={menus.data} roles={roles.data} readOnly={!canManage} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Submenus" description={submenus.length === 0 ? undefined : "In sidebar order."} />
          {submenus.length === 0 ? (
            <CardBody>
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                No submenus yet.{canManage && " Use Add submenu to create one under this menu."}
              </p>
            </CardBody>
          ) : (
            <MenusTable menus={menus.data} rootId={menu.id} roles={roles.data} canManage={canManage} />
          )}
        </Card>
      </div>
    </>
  );
}
