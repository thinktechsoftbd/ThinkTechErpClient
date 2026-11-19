import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ConfirmActionButton } from "@/core/crud/confirm-action-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { LucideIcon } from "@/core/ui/lucide-icon";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { createMenuFromListAction, deleteMenuFromListAction, saveMenuAction } from "../actions";
import { flattenMenuTree, menuAndDescendantIds } from "../menu-tree";
import { MENU_GROUP_PATH, type RoleSummary, type SecurityMenu } from "../types";
import { MenuFields } from "./menu-form";

const muted = "text-gray-500 dark:text-gray-400";

/**
 * Every menu as an indented tree, in sidebar order; with `rootId`, only that menu's submenus (its branch). With
 * `canManage` (SECURITY.M) each row adds a submenu, edits the menu in a popup, or deletes it after asking.
 */
export function MenusTable({
  menus,
  roles,
  canManage,
  rootId,
}: {
  /** Every menu: the tree, and the parent picker in the popups. */
  menus: SecurityMenu[];
  roles: RoleSummary[];
  canManage: boolean;
  rootId?: number;
}) {
  const roleNames = new Map(roles.map((role) => [role.id, role.name]));
  let rows = flattenMenuTree(menus);
  if (rootId !== undefined) {
    const branch = menuAndDescendantIds(menus, rootId);
    const rootDepth = rows.find((row) => row.menu.id === rootId)?.depth ?? 0;
    rows = rows
      .filter((row) => row.menu.id !== rootId && branch.has(row.menu.id))
      .map((row) => ({ ...row, depth: row.depth - rootDepth - 1 }));
  }
  const form = (props: { menu?: SecurityMenu; defaultParentId?: number }) => (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <MenuFields menus={menus} roles={roles} {...props} />
    </div>
  );

  return (
    <Table>
      <THead>
        <tr>
          <TH>Menu</TH>
          <TH>Path</TH>
          <TH className="text-right">Order</TH>
          <TH>Visible to</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map(({ menu, depth }) => (
          <TR key={menu.id}>
            <TD>
              <span className="flex items-center gap-2" style={{ paddingLeft: `${depth * 1.5}rem` }}>
                {depth > 0 && <span className={`${muted} select-none`}>└</span>}
                <LucideIcon name={menu.icon} className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <Link href={`/security/menus/${menu.id}`} className="font-medium text-brand-500 hover:underline">
                  {menu.title}
                </Link>
              </span>
            </TD>
            <TD className="font-mono text-xs">{menu.path === MENU_GROUP_PATH ? <Badge>Group</Badge> : menu.path}</TD>
            <TD className={`text-right ${muted}`}>{menu.sortOrder}</TD>
            <TD>
              {menu.roleId === null ? (
                <span className={muted}>Everyone</span>
              ) : (
                <Badge tone="brand">{roleNames.get(menu.roleId) ?? `Role #${menu.roleId}`}</Badge>
              )}
            </TD>
            <TD>
              <StatusBadge active={menu.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    iconOnly
                    tone="add"
                    icon={<Plus className="size-4" aria-hidden />}
                    label={`Add a submenu under ${menu.title}`}
                    title="New submenu"
                    description={`Under ${menu.title}`}
                    action={createMenuFromListAction}
                    submitLabel="Create menu"
                    size="lg"
                  >
                    {form({ defaultParentId: menu.id })}
                  </FormModalButton>
                  <FormModalButton
                    mode="edit"
                    iconOnly
                    icon={<Pencil className="size-4" aria-hidden />}
                    label={`Edit ${menu.title}`}
                    title="Edit menu"
                    description={menu.path === MENU_GROUP_PATH ? `${menu.title} · group` : `${menu.title} · ${menu.path}`}
                    action={saveMenuAction.bind(null, menu.id)}
                    submitLabel="Save menu"
                    size="lg"
                  >
                    {form({ menu })}
                  </FormModalButton>
                  <ConfirmActionButton
                    action={deleteMenuFromListAction.bind(null, menu.id)}
                    label={`Delete ${menu.title}`}
                    icon={<Trash2 className="size-4" aria-hidden />}
                    tone="delete"
                    title="Delete menu"
                    message={
                      <>
                        Delete <strong className="text-gray-800 dark:text-white/90">{menu.title}</strong>? It disappears from
                        everyone&apos;s sidebar. A menu that still has submenus can&apos;t be deleted.
                      </>
                    }
                    confirmLabel="Delete"
                    pendingLabel="Deleting…"
                    danger
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
