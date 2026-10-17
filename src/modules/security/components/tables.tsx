import Link from "next/link";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import type { SecurityRole, SecurityUser } from "../types";

const muted = "text-gray-500 dark:text-gray-400";

export function UsersTable({ users }: { users: SecurityUser[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>User</TH>
          <TH>Email</TH>
          <TH>Roles</TH>
          <TH>Status</TH>
          <TH>Last sign-in</TH>
        </tr>
      </THead>
      <TBody>
        {users.map((user) => (
          <TR key={user.userId}>
            <TD>
              <Link
                href={`/security/users/${encodeURIComponent(user.userId)}`}
                className="font-medium text-brand-500 hover:underline"
              >
                {user.userName}
              </Link>
              {user.displayName && <p className={`text-xs ${muted}`}>{user.displayName}</p>}
            </TD>
            <TD className={muted}>{user.email ?? "—"}</TD>
            <TD>
              <span className="flex flex-wrap gap-1">
                {user.roles.length > 0 ? user.roles.map((role) => <Badge key={role} tone="brand">{role}</Badge>) : "—"}
              </span>
            </TD>
            <TD>
              <StatusBadge active={user.isActive} />
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(user.lastLoginAt)}</TD>
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
          <TR key={role.roleId}>
            <TD>
              <Link
                href={`/security/roles/${encodeURIComponent(role.roleId)}`}
                className="font-mono font-medium text-brand-500 hover:underline"
              >
                {role.name}
              </Link>
              {role.isSystem && (
                <span className="ml-2">
                  <Badge>System</Badge>
                </span>
              )}
            </TD>
            <TD className={`max-w-96 truncate ${muted}`}>{role.description ?? "—"}</TD>
            <TD className="text-right">{formatNumber(role.permissions.length)}</TD>
            <TD className="text-right">{formatNumber(role.userCount ?? null)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
