import Link from "next/link";
import { ListFilter, Server, Trash2, UserCheck, UserX } from "lucide-react";
import type { ReactNode } from "react";
import { ConfirmActionButton } from "@/core/crud/confirm-action-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { rowAction } from "@/core/crud/row-action";
import { Avatar } from "@/core/ui/avatar";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { CopyButton } from "@/core/ui/copy-button";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { SortHeader, type SortDirection } from "@/core/crud/sort-header";
import {
  deletePermissionFromListAction,
  saveOrganizationAction,
  savePermissionAction,
  setUserStatusAction,
  updateUserAction,
} from "../actions";
import { deploymentPath } from "../deployment-types";
import type {
  Organization,
  OrganizationSmsProviderOption,
  RoleSummary,
  SecurityPermission,
  SecurityRole,
  SecurityUser,
} from "../types";
import { OrganizationFields, PermissionFields } from "./forms";
import { UserFields } from "./user-forms";

const muted = "text-gray-500 dark:text-gray-400";
const link = "font-medium text-brand-500 hover:underline";

/** An organization's SMS allocations: the SMS → Allocations list filtered to it. */
export function smsAllocationsHref(organization: Pick<Organization, "objectId">) {
  return `/sms/allocations?organizationId=${organization.objectId}`;
}

/**
 * With `canManage` (ORGANIZATION.M) each row has Edit, opening the form in a popup; with `smsLinks` (the
 * user can open the SMS module) it links to the organization's allocations; with `deploymentLinks`
 * (DEPLOYMENT.V or .M) to its deployment page. `smsProviders` feeds the Edit popup's SMS provider picker.
 */
export function OrganizationsTable({
  organizations,
  smsProviders,
  canManage = false,
  smsLinks = false,
  deploymentLinks = false,
}: {
  organizations: Organization[];
  smsProviders: OrganizationSmsProviderOption[];
  canManage?: boolean;
  smsLinks?: boolean;
  deploymentLinks?: boolean;
}) {
  const withActions = canManage || smsLinks || deploymentLinks;
  return (
    <Table>
      <THead>
        <tr>
          <TH>Organization</TH>
          <TH>Organization ID</TH>
          <TH>Code</TH>
          <TH>Slug</TH>
          <TH>Contact</TH>
          <TH>Location</TH>
          <TH className="text-right">SMS</TH>
          <TH>Status</TH>
          {withActions && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {organizations.map((organization) => (
          <TR key={organization.id}>
            <TD>
              <span className="flex flex-wrap items-center gap-2">
                <Link href={`/security/organizations/${organization.id}`} className={link}>
                  {organization.nameEn}
                </Link>
                {organization.isExternal && <Badge tone="warning">External</Badge>}
                {organization.isFinalized && <Badge tone="brand">Finalized</Badge>}
              </span>
              {organization.nameBn && <p className={`text-xs ${muted}`}>{organization.nameBn}</p>}
            </TD>
            <TD>
              <span className="flex items-center gap-1">
                <code className={`font-mono text-xs ${muted}`} title={organization.objectId}>
                  {organization.objectId.slice(0, 8)}…
                </code>
                <CopyButton value={organization.objectId} label="Copy" />
              </span>
            </TD>
            <TD className="font-mono text-xs">{organization.code ?? "—"}</TD>
            <TD className={organization.slug ? "font-mono text-xs" : muted}>{organization.slug ?? "—"}</TD>
            <TD className={muted}>
              {organization.email ?? "—"}
              {organization.phone && <p className="text-xs">{organization.phone}</p>}
            </TD>
            <TD className={muted}>{[organization.city, organization.country].filter(Boolean).join(", ") || "—"}</TD>
            <TD className="text-right">
              <span className="tabular-nums">{formatNumber(organization.smsUsage)} used</span>
              <p className={`text-xs ${muted}`}>{organization.smsProviderName ?? "No provider"}</p>
            </TD>
            <TD>
              <StatusBadge active={organization.isActive} />
            </TD>
            {withActions && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  {canManage && (
                    <FormModalButton
                      mode="edit"
                      label="Edit"
                      title="Edit organization"
                      description={organization.code ? `${organization.nameEn} · ${organization.code}` : organization.nameEn}
                      action={saveOrganizationAction.bind(null, organization.id)}
                      submitLabel="Save organization"
                      size="lg"
                    >
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <OrganizationFields organization={organization} smsProviders={smsProviders} />
                      </div>
                    </FormModalButton>
                  )}
                  {smsLinks && (
                    <Link href={smsAllocationsHref(organization)} className={rowAction("view")} title={`SMS allocations of ${organization.nameEn}`}>
                      <ListFilter className="size-4" aria-hidden /> Allocations
                    </Link>
                  )}
                  {deploymentLinks && (
                    <Link
                      href={deploymentPath({ objectId: organization.objectId, slug: organization.slug, name: organization.nameEn })}
                      className={rowAction("neutral")}
                      title={`What is deployed for ${organization.nameEn}`}
                    >
                      <Server className="size-4" aria-hidden /> Deployment
                    </Link>
                  )}
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

/** The permission's form in a popup, opened from `label` (the code, or an icon). */
function PermissionEditPopup({
  permission,
  label,
  iconOnly,
  icon,
  triggerClassName,
}: {
  permission: SecurityPermission;
  label: string;
  iconOnly?: boolean;
  icon?: ReactNode;
  triggerClassName?: string;
}) {
  return (
    <FormModalButton
      mode="edit"
      label={label}
      iconOnly={iconOnly}
      icon={icon}
      triggerClassName={triggerClassName}
      title="Edit permission"
      description={`${permission.code} · ${permission.name}`}
      action={savePermissionAction.bind(null, permission.id)}
      submitLabel="Save permission"
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <PermissionFields permission={permission} />
      </div>
    </FormModalButton>
  );
}

/**
 * The permissions list. With `sorting` its headers sort the list on the server (code, name, description); with
 * `canManage` (SECURITY.M) the code opens the permission in a popup, and each row has Edit and Delete icons.
 */
export function PermissionsTable({
  permissions,
  canManage = false,
  sorting,
}: {
  permissions: SecurityPermission[];
  canManage?: boolean;
  sorting?: { sort: string; direction: SortDirection; basePath: string; query: Record<string, string | undefined> };
}) {
  const header = (label: string, column: string) =>
    sorting ? <SortHeader label={label} column={column} {...sorting} /> : <TH>{label}</TH>;
  return (
    <Table>
      <THead>
        <tr>
          {header("Code", "code")}
          {header("Name", "name")}
          {header("Description", "description")}
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {permissions.map((permission) => (
          <TR key={permission.id}>
            <TD>
              {/* Managers edit in a popup from the code; others open the permission's page. */}
              {canManage ? (
                <PermissionEditPopup permission={permission} label={permission.code} icon={null} triggerClassName={`font-mono ${link}`} />
              ) : (
                <Link href={`/security/permissions/${permission.id}`} className={`font-mono ${link}`}>
                  {permission.code}
                </Link>
              )}
            </TD>
            <TD>{permission.name}</TD>
            <TD className={`max-w-96 truncate ${muted}`}>{permission.description ?? "—"}</TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <PermissionEditPopup permission={permission} label={`Edit ${permission.code}`} iconOnly />
                  <ConfirmActionButton
                    action={deletePermissionFromListAction.bind(null, permission.id)}
                    label={`Delete ${permission.code}`}
                    icon={<Trash2 className="size-4" aria-hidden />}
                    tone="delete"
                    title="Delete permission"
                    message={
                      <>
                        Delete <strong className="font-mono text-gray-800 dark:text-white/90">{permission.code}</strong>? Roles and
                        users that hold it lose it. This cannot be undone.
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

export function RolesTable({ roles }: { roles: SecurityRole[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Role</TH>
          <TH>Description</TH>
          <TH className="text-right">Permissions</TH>
          <TH className="text-right">Users</TH>
        </tr>
      </THead>
      <TBody>
        {roles.map((role) => (
          <TR key={role.id}>
            <TD>
              <Link href={`/security/roles/${role.id}`} className={link}>
                {role.name}
              </Link>
            </TD>
            <TD className={`max-w-96 truncate ${muted}`}>{role.description ?? "—"}</TD>
            <TD className="text-right">{formatNumber(role.permissions.length)}</TD>
            <TD className="text-right">{formatNumber(role.userCount)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

/**
 * With `canManage` (SECURITY.M) each row has an Edit icon, opening the user's form in a popup with its values,
 * and an Activate / Deactivate icon that asks first. `roles` are the ones the popup's role picker offers.
 */
export function UsersTable({
  users,
  canManage = false,
  roles = [],
}: {
  users: SecurityUser[];
  canManage?: boolean;
  roles?: RoleSummary[];
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>User</TH>
          <TH>Roles</TH>
          <TH>Status</TH>
          <TH>Created</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {users.map((user) => (
          <TR key={user.id}>
            <TD>
              <div className="flex items-center gap-3">
                <Avatar name={user.fullName || user.name} src={user.photoUrl} />
                <div className="min-w-0">
                  <Link href={`/security/users/${user.id}`} className={link}>
                    {user.fullName || user.name}
                  </Link>
                  <p className={`text-xs ${muted}`}>
                    {user.email}
                    {user.cellphoneNo && <> · {user.cellphoneNo}</>}
                  </p>
                </div>
              </div>
            </TD>
            <TD>
              <span className="flex flex-wrap gap-1">
                {user.roles.length > 0
                  ? user.roles.map((role) => (
                      <Badge key={role.id} tone="brand">
                        {role.name}
                      </Badge>
                    ))
                  : "—"}
              </span>
            </TD>
            <TD>
              <span className="flex flex-wrap items-center gap-1">
                <StatusBadge active={user.status === "ACTIVE"} />
                {user.isLocked && <Badge tone="error">Locked</Badge>}
              </span>
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(user.createdAt)}</TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    iconOnly
                    label={`Edit ${user.fullName || user.name}`}
                    title="Edit user"
                    description={`${user.fullName || user.name} · ${user.email}`}
                    action={updateUserAction.bind(null, user.id)}
                    submitLabel="Save user"
                    size="wide"
                  >
                    <UserFields user={user} roles={roles} />
                  </FormModalButton>
                  {user.status === "ACTIVE" ? (
                    <ConfirmActionButton
                      action={setUserStatusAction.bind(null, user.id, "INACTIVE")}
                      label={`Deactivate ${user.fullName || user.name}`}
                      icon={<UserX className="size-4" aria-hidden />}
                      tone="delete"
                      title="Deactivate user"
                      message={
                        <>
                          <strong className="text-gray-800 dark:text-white/90">{user.fullName || user.name}</strong> won&apos;t be
                          able to sign in, and their open sessions end. You can activate them again at any time.
                        </>
                      }
                      confirmLabel="Deactivate"
                      pendingLabel="Deactivating…"
                      danger
                    />
                  ) : (
                    <ConfirmActionButton
                      action={setUserStatusAction.bind(null, user.id, "ACTIVE")}
                      label={`Activate ${user.fullName || user.name}`}
                      icon={<UserCheck className="size-4" aria-hidden />}
                      tone="positive"
                      title="Activate user"
                      message={
                        <>
                          <strong className="text-gray-800 dark:text-white/90">{user.fullName || user.name}</strong> will be able
                          to sign in again{user.isLocked ? " once their account is unlocked (it is locked)" : ""}.
                        </>
                      }
                      confirmLabel="Activate"
                      pendingLabel="Activating…"
                    />
                  )}
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
