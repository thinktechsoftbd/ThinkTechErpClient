// Contract the client expects from the (not yet implemented) Security area of ThinkTechErpAPI.
// See README "Security API contract".

export type SecurityUser = {
  userId: string;
  userName: string;
  email: string | null;
  displayName: string | null;
  isActive: boolean;
  roles: string[];
  createdAt?: string | null;
  lastLoginAt?: string | null;
};

export type SecurityRole = {
  roleId: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount?: number | null;
  isSystem?: boolean | null;
};

export type UserCreateRequest = {
  userName: string;
  email: string | null;
  displayName: string | null;
  password: string;
  isActive: boolean;
  roles: string[];
};

export type UserUpdateRequest = {
  email: string | null;
  displayName: string | null;
  isActive: boolean;
  roles: string[];
};

export type RoleUpsertRequest = {
  name: string;
  description: string | null;
  permissions: string[];
};

export const SECURITY_PAGE_SIZE = 25;
export const MIN_PASSWORD_LENGTH = 8;
