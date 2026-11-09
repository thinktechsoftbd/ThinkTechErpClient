// Contract of ThinkTechErpAPI's Security area (Areas/Security). Ids are integers; JSON is camelCase.

export const SECURITY_VIEW_PERMISSION = "SECURITY.V";
export const SECURITY_MANAGE_PERMISSION = "SECURITY.M";
/** Organizations have their own pair; viewing also works with SECURITY.V/M (the API's OrganizationView policy). */
export const ORGANIZATION_VIEW_PERMISSION = "ORGANIZATION.V";
export const ORGANIZATION_MANAGE_PERMISSION = "ORGANIZATION.M";

export type PagedResult<T> = { items: T[]; totalCount: number; limit: number; offset: number };

// ---- Integration organization clients

export type OrganizationClient = {
  id: number;
  objectId: string;
  clientName: string;
  clientSecret: string | null;
  secretSha256Hash: string | null;
  orgObjectId: string;
  organizationName: string | null;
  actingUserId: number | null;
  actingUserName: string | null;
  scopes: string[];
  isActive: boolean;
  hasSecretSha256Hash: boolean;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

/** An empty hash on update leaves the existing hash unchanged. */
export type OrganizationClientUpsertRequest = {
  clientName: string;
  clientSecret: string;
  secretSha256Hash: string;
  orgObjectId: string | null;
  actingUserId: number | null;
  scopes: string[];
  isActive: boolean;
};

export type OrganizationClientOrganizationOption = {
  objectId: string;
  nameEn: string;
  code: string | null;
  isActive: boolean;
};

// ---- Organizations

export type Organization = {
  id: number;
  /** The "Organization Id": a UUID, unique, editable. */
  objectId: string;
  nameEn: string;
  nameBn: string | null;
  slogan: string | null;
  code: string | null;
  /** A unique, URL-friendly name, e.g. dental-test-care. */
  slug: string | null;
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
  /** Outside this company (e.g. a customer) rather than one of its own organizations. */
  isExternal: boolean;
  isActive: boolean;
  /** SMS the organization has used, recorded under SMS → Organizations; read-only here. */
  smsUsage: number;
  /** Finalized: its SMS allocations are locked (none can be added, changed or deleted). */
  isFinalized: boolean;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type OrganizationUpsertRequest = Omit<
  Organization,
  "id" | "objectId" | "smsUsage" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy"
> & {
  /** Null keeps the current Organization Id (or, on create, lets the API generate one). */
  objectId: string | null;
};

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/**
 * An organization linked to a user (GET /api/security/users/{id}/organizations). Inventory and
 * Purchase data belongs to an organization; users without ORGANIZATION.M work only in linked ones.
 */
export type UserOrganization = {
  organizationId: number;
  name: string;
  code: string | null;
  isDefault: boolean;
  /** Always true here; false only for a Super Admin's unlinked organizations in my-organizations. */
  isLinked: boolean;
  /** Outside this company (e.g. a customer): left out of the header's switcher and the "current" organization. */
  isExternal: boolean;
};

/** Replaces the user's links; a null default makes the first organization the default. */
export type UserOrganizationsUpdateRequest = { organizationIds: number[]; defaultOrganizationId: number | null };

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

// ---- Subscriptions (modules an organization can subscribe to, and its subscriptions)

export type SubscriptionModule = {
  id: number;
  objectId: string;
  moduleName: string;
  isActive: boolean;
  remarks: string | null;
  /** Number of subscriptions to this module. */
  subscriptionCount: number;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type SubscriptionModuleUpsertRequest = { moduleName: string; isActive: boolean; remarks: string | null };

// ---- Subscription plans, with their features and each feature's details

export type SubscriptionPlanFeatureDetail = { id: number; objectId: string; featureId: number; description: string };

export type SubscriptionPlanFeature = {
  id: number;
  objectId: string;
  subscriptionPlanId: number;
  title: string;
  isActive: boolean;
  details: SubscriptionPlanFeatureDetail[];
};

export type SubscriptionPlan = {
  id: number;
  objectId: string;
  nameEn: string;
  nameLocal: string | null;
  shortNote: string | null;
  regularPrice: number;
  discountPercentage: number;
  /** The price after the discount. */
  discountPrice: number;
  /** A value of the "Currency" lookup table. */
  currencyLookupDataId: number;
  currencyName: string;
  localExchangeRate: number;
  billingPeriodType: BillingPeriodType;
  isActive: boolean;
  featureCount: number;
  features: SubscriptionPlanFeature[];
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type SubscriptionPlanUpsertRequest = {
  nameEn: string;
  nameLocal: string | null;
  shortNote: string | null;
  regularPrice: number;
  /** Above 0: the API works out the discount price from it. */
  discountPercentage: number;
  /** Used only when the percentage is 0 (the API then works out the percentage). */
  discountPrice: number | null;
  currencyLookupDataId: number;
  localExchangeRate: number;
  billingPeriodType: BillingPeriodType;
  isActive: boolean;
  /** Saved features and details keep their id; new ones have none; those left out are removed. */
  features: { id: number | null; title: string; isActive: boolean; details: { id: number | null; description: string }[] }[];
};

export const SUBSCRIPTION_TYPES = ["Free Trial", "Premium"] as const;
export const BILLING_PERIOD_TYPES = ["Monthly", "Yearly"] as const;
export const SUBSCRIPTION_STATUSES = ["Pending", "Active", "Expired", "Cancelled"] as const;
export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[number];
export type BillingPeriodType = (typeof BILLING_PERIOD_TYPES)[number];
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export type Subscription = {
  id: number;
  organizationId: number;
  organizationName: string;
  subscriptionModuleId: number;
  moduleName: string;
  subscriptionType: SubscriptionType;
  billingPeriodType: BillingPeriodType;
  billingPeriodCount: number;
  /** Calendar dates, "YYYY-MM-DD". */
  startDate: string;
  endDate: string;
  currencyLookupDataId: number;
  currencyName: string;
  localExchangeRate: number;
  subtotalAmount: number;
  discountPercentage: number;
  discountAmount: number;
  vatAmount: number;
  /** subtotal − discount + VAT, calculated by the API. */
  totalAmount: number;
  status: SubscriptionStatus;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type SubscriptionUpsertRequest = {
  organizationId: number;
  subscriptionModuleId: number;
  subscriptionType: SubscriptionType;
  billingPeriodType: BillingPeriodType;
  billingPeriodCount: number;
  startDate: string;
  /** Null: the API sets start date + billing period × count − 1 day. */
  endDate: string | null;
  currencyLookupDataId: number;
  localExchangeRate: number;
  subtotalAmount: number;
  /** Above 0, the API calculates the discount amount from it. */
  discountPercentage: number;
  discountAmount: number;
  vatAmount: number;
  status: SubscriptionStatus;
};

export type SubscriptionFilter = {
  organizationId?: number;
  subscriptionModuleId?: number;
  status?: SubscriptionStatus;
  subscriptionType?: SubscriptionType;
  search?: string;
};
