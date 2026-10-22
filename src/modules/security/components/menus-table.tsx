import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { LucideIcon } from "@/core/ui/lucide-icon";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { flattenMenuTree } from "../menu-tree";
import { MENU_GROUP_PATH, type RoleSummary, type SecurityMenu } from "../types";

const muted = "text-gray-500 dark:text-gray-400";

/** Every menu as an indented tree, in sidebar order. */
export function MenusTable({
  menus,
  roles,
  canManage,
}: {
  menus: SecurityMenu[];
  roles: RoleSummary[];
  canManage: boolean;
}) {
  const roleNames = new Map(roles.map((role) => [role.id, role.name]));

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
        {flattenMenuTree(menus).map(({ menu, depth }) => (
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
            <TD className="font-mono text-xs">
              {menu.path === MENU_GROUP_PATH ? <Badge>Group</Badge> : menu.path}
            </TD>
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
                <Link
                  href={`/security/menus/new?parentId=${menu.id}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                >
                  <Plus className="size-4" aria-hidden /> Submenu
                </Link>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
