import "server-only";
import { apiFetch } from "@/core/api/client";
import type {
  MenuUpsertRequest,
  Organization,
  OrganizationUpsertRequest,
  PagedResult,
  PermissionUpsertRequest,
  RoleUpsertRequest,
  SecurityMenu,
  SecurityPermission,
  SecurityRole,
  SecurityUser,
  UserCreateRequest,
  UserMenuAccess,
  UserMenuAccessItem,
  UserPermissionSet,
  UserStatus,
  UserUpdateRequest,
} from "./types";

const base = "/api/security";
const menu = (id: number) => `${base}/menus/${id}`;
const organization = (id: number) => `${base}/organizations/${id}`;
const permission = (id: number) => `${base}/permissions/${id}`;
const role = (id: number) => `${base}/roles/${id}`;
const user = (id: number) => `${base}/users/${id}`;

export const securityApi = {
  getOrganizations: () => apiFetch<Organization[]>(`${base}/organizations`),
  getOrganization: (id: number) => apiFetch<Organization>(organization(id)),
  createOrganization: (body: OrganizationUpsertRequest) =>
    apiFetch<Organization>(`${base}/organizations`, { method: "POST", body }),
  updateOrganization: (id: number, body: OrganizationUpsertRequest) =>
    apiFetch<Organization>(organization(id), { method: "PUT", body }),

  getPermissions: () => apiFetch<SecurityPermission[]>(`${base}/permissions`),
  getPermission: (id: number) => apiFetch<SecurityPermission>(permission(id)),
  createPermission: (body: PermissionUpsertRequest) =>
    apiFetch<SecurityPermission>(`${base}/permissions`, { method: "POST", body }),
  updatePermission: (id: number, body: PermissionUpsertRequest) =>
    apiFetch<SecurityPermission>(permission(id), { method: "PUT", body }),
  deletePermission: (id: number) => apiFetch<void>(permission(id), { method: "DELETE" }),

  getRoles: () => apiFetch<SecurityRole[]>(`${base}/roles`),
  getRole: (id: number) => apiFetch<SecurityRole>(role(id)),
  createRole: (body: RoleUpsertRequest) => apiFetch<SecurityRole>(`${base}/roles`, { method: "POST", body }),
  updateRole: (id: number, body: RoleUpsertRequest) => apiFetch<SecurityRole>(role(id), { method: "PUT", body }),
  deleteRole: (id: number) => apiFetch<void>(role(id), { method: "DELETE" }),

  getUsers: (query: { limit: number; offset: number; search?: string; status?: UserStatus }) =>
    apiFetch<PagedResult<SecurityUser>>(`${base}/users`, { query }),
  getUser: (id: number) => apiFetch<SecurityUser>(user(id)),
  createUser: (body: UserCreateRequest) => apiFetch<SecurityUser>(`${base}/users`, { method: "POST", body }),
  updateUser: (id: number, body: UserUpdateRequest) => apiFetch<SecurityUser>(user(id), { method: "PUT", body }),
  setPassword: (id: number, newPassword: string) =>
    apiFetch<void>(`${user(id)}/password`, { method: "PUT", body: { newPassword } }),
  getUserPermissions: (id: number) => apiFetch<UserPermissionSet>(`${user(id)}/permissions`),
  setUserPermissions: (id: number, permissionIds: number[]) =>
    apiFetch<UserPermissionSet>(`${user(id)}/permissions`, { method: "PUT", body: { permissionIds } }),
  getUserMenus: (id: number) => apiFetch<UserMenuAccess[]>(`${user(id)}/menus`),
  setUserMenus: (id: number, menus: UserMenuAccessItem[]) =>
    apiFetch<UserMenuAccess[]>(`${user(id)}/menus`, { method: "PUT", body: { menus } }),

  /** Every menu (administration list), for menu settings and per-user menu access. */
  getMenus: () => apiFetch<SecurityMenu[]>(`${base}/menus`),
  getMenu: (id: number) => apiFetch<SecurityMenu>(menu(id)),
  createMenu: (body: MenuUpsertRequest) => apiFetch<SecurityMenu>(`${base}/menus`, { method: "POST", body }),
  updateMenu: (id: number, body: MenuUpsertRequest) => apiFetch<SecurityMenu>(menu(id), { method: "PUT", body }),
  deleteMenu: (id: number) => apiFetch<void>(menu(id), { method: "DELETE" }),
};
