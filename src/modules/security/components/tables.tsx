import Link from "next/link";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import type { Organization, SecurityPermission, SecurityRole, SecurityUser } from "../types";

const muted = "text-gray-500 dark:text-gray-400";
const link = "font-medium text-brand-500 hover:underline";

export function OrganizationsTable({ organizations }: { organizations: Organization[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Organization</TH>
          <TH>Code</TH>
          <TH>Contact</TH>
          <TH>Location</TH>
          <TH>Status</TH>
        </tr>
      </THead>
      <TBody>
        {organizations.map((organization) => (
          <TR key={organization.id}>
            <TD>
              <Link href={`/security/organizations/${organization.id}`} className={link}>
                {organization.nameEn}
              </Link>
              {organization.nameBn && <p className={`text-xs ${muted}`}>{organization.nameBn}</p>}
            </TD>
            <TD className="font-mono text-xs">{organization.code ?? "—"}</TD>
            <TD className={muted}>
              {organization.email ?? "—"}
              {organization.phone && <p className="text-xs">{organization.phone}</p>}
            </TD>
            <TD className={muted}>{[organization.city, organization.country].filter(Boolean).join(", ") || "—"}</TD>
            <TD>
              <StatusBadge active={organization.isActive} />
            </TD>
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
