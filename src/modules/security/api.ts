import "server-only";
import { apiFetch } from "@/core/api/client";
import type { RoleUpsertRequest, SecurityRole, SecurityUser, UserCreateRequest, UserUpdateRequest } from "./types";

const base = "/api/security";
const user = (userId: string) => `${base}/users/${encodeURIComponent(userId)}`;
const role = (roleId: string) => `${base}/roles/${encodeURIComponent(roleId)}`;

export const securityApi = {
  getUsers: (limit: number, offset: number, search?: string) =>
    apiFetch<SecurityUser[]>(`${base}/users`, { query: { limit, offset, search } }),
  getUser: (userId: string) => apiFetch<SecurityUser>(user(userId)),
  createUser: (body: UserCreateRequest) => apiFetch<SecurityUser>(`${base}/users`, { method: "POST", body }),
  updateUser: (userId: string, body: UserUpdateRequest) => apiFetch<SecurityUser>(user(userId), { method: "PUT", body }),
  resetPassword: (userId: string, newPassword: string) =>
    apiFetch<void>(`${user(userId)}/password`, { method: "POST", body: { newPassword } }),

  getRoles: () => apiFetch<SecurityRole[]>(`${base}/roles`),
  getRole: (roleId: string) => apiFetch<SecurityRole>(role(roleId)),
  createRole: (body: RoleUpsertRequest) => apiFetch<SecurityRole>(`${base}/roles`, { method: "POST", body }),
  updateRole: (roleId: string, body: RoleUpsertRequest) => apiFetch<SecurityRole>(role(roleId), { method: "PUT", body }),
  deleteRole: (roleId: string) => apiFetch<void>(role(roleId), { method: "DELETE" }),
};
