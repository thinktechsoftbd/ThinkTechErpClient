"use client";

import { useState } from "react";
import { ActionForm, FormMessage } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import type { SecurityMenu, UserMenuAccess } from "../types";
import { FormActions } from "./form-parts";

const FLAGS = [
  { key: "view", label: "View", field: "canView" },
  { key: "create", label: "Create", field: "canCreate" },
  { key: "edit", label: "Edit", field: "canEdit" },
  { key: "delete", label: "Delete", field: "canDelete" },
] as const;

/** Menus in tree order (parents before their children) with their depth. */
function treeOrder(menus: SecurityMenu[]) {
  const byParent = new Map<number | null, SecurityMenu[]>();
  for (const menu of menus) byParent.set(menu.parentId, [...(byParent.get(menu.parentId) ?? []), menu]);
  const ordered: { menu: SecurityMenu; depth: number }[] = [];
  const seen = new Set<number>();
  const visit = (parentId: number | null, depth: number) => {
    for (const menu of (byParent.get(parentId) ?? []).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
      if (seen.has(menu.id)) continue;
      seen.add(menu.id);
      ordered.push({ menu, depth });
      visit(menu.id, depth + 1);
    }
  };
  visit(null, 0);
  // Menus whose parent is missing still get a row.
  for (const menu of menus) if (!seen.has(menu.id)) ordered.push({ menu, depth: 0 });
  return ordered;
}

/**
 * Per-user menu overrides. "Default" menus follow their role (or everyone when they have
 * none); "Custom" rows replace that with the checked flags for this user.
 */
export function UserMenuAccessForm({
  action,
  menus,
  overrides,
  roleNames,
  readOnly,
}: {
  action: FormAction;
  menus: SecurityMenu[];
  overrides: UserMenuAccess[];
  roleNames: Record<number, string>;
  readOnly?: boolean;
}) {
  const overrideById = new Map(overrides.map((override) => [override.menuId, override]));
  const [custom, setCustom] = useState(() => new Set(overrides.map((override) => override.menuId)));

  const toggle = (menuId: number, on: boolean) =>
    setCustom((current) => {
      const next = new Set(current);
      if (on) next.add(menuId);
      else next.delete(menuId);
      return next;
    });

  return (
    <ActionForm action={action}>
      <fieldset disabled={readOnly} className="space-y-5">
        <FormMessage />
        <Table>
          <THead>
            <tr>
              <TH>Menu</TH>
              <TH>Access</TH>
              {FLAGS.map((flag) => (
                <TH key={flag.key} className="text-center">
                  {flag.label}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {treeOrder(menus).map(({ menu, depth }) => {
              const override = overrideById.get(menu.id);
              const isCustom = custom.has(menu.id);
              return (
                <TR key={menu.id}>
                  <TD>
                    <input type="hidden" name="menuIds" value={menu.id} />
                    <div style={{ paddingLeft: `${depth * 1.25}rem` }}>
                      <span className="font-medium text-gray-800 dark:text-white/90">{menu.title}</span>
                      {!menu.isActive && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{menu.path}</p>
                    </div>
                  </TD>
                  <TD>
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        name={`menu.${menu.id}.custom`}
                        checked={isCustom}
                        onChange={(event) => toggle(menu.id, event.target.checked)}
                        className="size-4 rounded border-gray-300 accent-brand-500 dark:border-gray-700"
                      />
                      Custom
                    </label>
                    {!isCustom && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Default: {menu.roleId ? `role ${roleNames[menu.roleId] ?? `#${menu.roleId}`}` : "everyone"}
                      </p>
                    )}
                  </TD>
                  {FLAGS.map((flag) => (
                    <TD key={flag.key} className="text-center">
                      <input
                        type="checkbox"
                        name={`menu.${menu.id}.${flag.key}`}
                        aria-label={`${flag.label} ${menu.title}`}
                        disabled={!isCustom}
                        defaultChecked={override ? override[flag.field] : flag.key === "view"}
                        className="size-4 rounded border-gray-300 accent-brand-500 disabled:opacity-40 dark:border-gray-700"
                      />
                    </TD>
                  ))}
                </TR>
              );
            })}
          </TBody>
        </Table>
        <FormActions readOnly={readOnly} submitLabel="Save menu access" />
      </fieldset>
    </ActionForm>
  );
}
