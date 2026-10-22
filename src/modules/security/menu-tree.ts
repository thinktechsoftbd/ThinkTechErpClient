import type { SecurityMenu } from "./types";

export type MenuTreeRow = { menu: SecurityMenu; depth: number };

const byOrder = (a: SecurityMenu, b: SecurityMenu) => a.sortOrder - b.sortOrder || a.id - b.id;

/**
 * Menus in sidebar order, depth-first, each with its nesting depth. Menus whose parent is
 * missing are shown at the top level so nothing disappears from the list.
 */
export function flattenMenuTree(menus: readonly SecurityMenu[]): MenuTreeRow[] {
  const ids = new Set(menus.map((menu) => menu.id));
  const children = new Map<number | null, SecurityMenu[]>();
  for (const menu of menus) {
    const parent = menu.parentId !== null && ids.has(menu.parentId) ? menu.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), menu]);
  }

  const rows: MenuTreeRow[] = [];
  const seen = new Set<number>();
  const visit = (parent: number | null, depth: number) => {
    for (const menu of [...(children.get(parent) ?? [])].sort(byOrder)) {
      if (seen.has(menu.id)) continue; // guards against cycles in the data
      seen.add(menu.id);
      rows.push({ menu, depth });
      visit(menu.id, depth + 1);
    }
  };
  visit(null, 0);
  // Anything only reachable through a cycle.
  for (const menu of [...menus].sort(byOrder)) if (!seen.has(menu.id)) rows.push({ menu, depth: 0 });
  return rows;
}

/** The menu and all of its submenus: these can't become its parent. */
export function menuAndDescendantIds(menus: readonly SecurityMenu[], id: number) {
  const result = new Set<number>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const menu of menus) {
      if (menu.parentId !== null && result.has(menu.parentId) && !result.has(menu.id)) {
        result.add(menu.id);
        grew = true;
      }
    }
  }
  return result;
}
