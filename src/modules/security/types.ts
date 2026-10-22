// Contract of ThinkTechErpAPI's Security area (Areas/Security). Ids are integers; JSON is camelCase.

export const SECURITY_VIEW_PERMISSION = "SECURITY.V";
export const SECURITY_MANAGE_PERMISSION = "SECURITY.M";

export type PagedResult<T> = { items: T[]; totalCount: number; limit: number; offset: number };

// ---- Organizations

export type Organization = {
  id: number;
  nameEn: string;
  nameBn: string | null;
  slogan: string | null;
  code: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type OrganizationUpsertRequest = Omit<Organization, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">;

// ---- Permissions and roles

export type SecurityPermission = { id: number; code: string; name: string; description: string | null };

export type PermissionUpsertRequest = { code: string; name: string; description: string | null };

export type SecurityRole = {
  id: number;
  name: string;
  description: string | null;
  userCount: number;
  permissions: SecurityPermission[];
};

export type RoleUpsertRequest = { name: string; description: string | null; permissionIds: number[] };

// ---- Users

export type UserStatus = "ACTIVE" | "INACTIVE";
export const USER_STATUSES: readonly UserStatus[] = ["ACTIVE", "INACTIVE"];

export type RoleSummary = { id: number; name: string };

export type SecurityUser = {
  id: number;
  name: string;
  email: string;
  photoUrl: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  roles: RoleSummary[];
};

export type UserCreateRequest = {
  name: string;
  email: string;
  password: string;
  photoUrl: string | null;
  status: UserStatus;
  roleIds: number[];
};

export type UserUpdateRequest = Omit<UserCreateRequest, "password">;

export type UserPermissionSet = {
  /** Granted to the user directly. */
  direct: SecurityPermission[];
  /** Codes from the user's roles plus direct grants: what the access token carries. */
  effective: string[];
};

/** A per-user menu override; menus without one follow their role. */
export type UserMenuAccess = {
  menuId: number;
  title: string;
  path: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type UserMenuAccessItem = Omit<UserMenuAccess, "title" | "path">;

/** A row of the menu table (GET /api/security/menus). */
export type SecurityMenu = {
  id: number;
  title: string;
  path: string;
  icon: string | null;
  sortOrder: number;
  parentId: number | null;
  roleId: number | null;
  isActive: boolean;
};

export type MenuUpsertRequest = Omit<SecurityMenu, "id">;

/** Path of a menu that only groups child menus (it has no page of its own). */
export const MENU_GROUP_PATH = "#";

export const SECURITY_PAGE_SIZE = 25;
export const MIN_PASSWORD_LENGTH = 8;
/** bcrypt reads only the first 72 bytes; the API rejects longer passwords. */
export const MAX_PASSWORD_BYTES = 72;
export const PERMISSION_CODE_PATTERN = /^[A-Z][A-Z0-9_]*(\.[A-Z0-9_]+)*$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
