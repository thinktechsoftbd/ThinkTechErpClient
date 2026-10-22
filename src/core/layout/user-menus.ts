import "server-only";
import { apiFetch, tryApi } from "@/core/api/client";
import { serverEnv } from "@/core/config/server-env";

/** A node of the signed-in user's menu tree (GET /api/security/auth/menus). */
export type MenuNode = {
  id: number;
  title: string;
  /** Client route, or "#" for a group that only holds child menus. */
  path: string;
  /** Lucide icon name, e.g. "layout-dashboard". */
  icon?: string | null;
  sortOrder: number;
  parentId?: number | null;
  canCreate?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
  children: MenuNode[];
};

/**
 * The signed-in user's menus, already filtered by the API to what they may view. Null when
 * they can't be loaded: dev sign-in tokens have no API user, or the API call failed.
 */
export async function getUserMenus(): Promise<MenuNode[] | null> {
  if (serverEnv.authMode === "dev") return null;

  const result = await tryApi(() => apiFetch<MenuNode[]>("/api/security/auth/menus"));
  if (!result.ok) {
    console.warn(`Could not load the user's menus; using the built-in module menu. ${result.error.message}`);
    return null;
  }
  return result.data;
}
