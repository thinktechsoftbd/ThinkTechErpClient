import Link from "next/link";
import { ListFilter } from "lucide-react";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { rowAction } from "@/core/crud/row-action";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { CopyButton } from "@/core/ui/copy-button";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { saveOrganizationAction } from "../actions";
import type { Organization, SecurityPermission, SecurityRole, SecurityUser } from "../types";
import { OrganizationFields } from "./forms";

const muted = "text-gray-500 dark:text-gray-400";
const link = "font-medium text-brand-500 hover:underline";

/** An organization's SMS allocations: the SMS → Allocations list filtered to it. */
export function smsAllocationsHref(organization: Pick<Organization, "objectId">) {
  return `/sms/allocations?organizationId=${organization.objectId}`;
}

/**
 * With `canManage` (ORGANIZATION.M) each row has Edit, opening the form in a popup; with `smsLinks` (the
 * user can open the SMS module) it links to the organization's allocations.
 */
export function OrganizationsTable({
  organizations,
  canManage = false,
  smsLinks = false,
}: {
  organizations: Organization[];
  canManage?: boolean;
  smsLinks?: boolean;
}) {
  const withActions = canManage || smsLinks;
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
          <TH className="text-right">SMS used</TH>
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
            <TD className="text-right tabular-nums">{formatNumber(organization.smsUsage)}</TD>
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
                        <OrganizationFields organization={organization} />
                      </div>
                    </FormModalButton>
                  )}
                  {smsLinks && (
                    <Link href={smsAllocationsHref(organization)} className={rowAction("view")} title={`SMS allocations of ${organization.nameEn}`}>
                      <ListFilter className="size-4" aria-hidden /> Allocations
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

export function PermissionsTable({ permissions }: { permissions: SecurityPermission[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Code</TH>
          <TH>Name</TH>
          <TH>Description</TH>
        </tr>
      </THead>
      <TBody>
        {permissions.map((permission) => (
          <TR key={permission.id}>
            <TD>
              <Link href={`/security/permissions/${permission.id}`} className={`font-mono ${link}`}>
                {permission.code}
              </Link>
            </TD>
            <TD>{permission.name}</TD>
            <TD className={`max-w-96 truncate ${muted}`}>{permission.description ?? "—"}</TD>
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

export function UsersTable({ users }: { users: SecurityUser[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>User</TH>
          <TH>Roles</TH>
          <TH>Status</TH>
          <TH>Created</TH>
        </tr>
      </THead>
      <TBody>
        {users.map((user) => (
          <TR key={user.id}>
            <TD>
              <Link href={`/security/users/${user.id}`} className={link}>
                {user.name}
              </Link>
              <p className={`text-xs ${muted}`}>{user.email}</p>
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
              <StatusBadge active={user.status === "ACTIVE"} />
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(user.createdAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
