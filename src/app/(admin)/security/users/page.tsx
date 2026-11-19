import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageSecurity } from "@/modules/security/access";
import { securityApi } from "@/modules/security/api";
import { ManageOnly } from "@/modules/security/components/manage-only";
import { UsersTable } from "@/modules/security/components/tables";
import { SECURITY_PAGE_SIZE, USER_STATUSES, type UserStatus } from "@/modules/security/types";

export const metadata: Metadata = { title: "Users" };

const basePath = "/security/users";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

export default function UsersPage({ searchParams }: PageProps<"/security/users">) {
  return (
    <>
      <PageHeader
        title="Users"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Users" }]}
        actions={
          <Suspense>
            <ManageOnly>
              <LinkButton href="/security/users/new">
                <Plus className="size-4" aria-hidden /> New user
              </LinkButton>
            </ManageOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={5} />}>
          <UsersList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API returns one page (SECURITY_PAGE_SIZE) of the users matching ?q and ?status.
async function UsersList({ searchParams }: Pick<PageProps<"/security/users">, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const statusParam = firstParam(query.status);
  const status = (USER_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as UserStatus) : undefined;
  const offset = parseOffset(query.offset);

  const session = await requireSession();
  const canManage = canManageSecurity(session);
  const [result, roles] = await Promise.all([
    tryApi(() => securityApi.getUsers({ limit: SECURITY_PAGE_SIZE, offset, search, status })),
    // Only the edit popup's role picker needs them.
    canManage ? tryApi(() => securityApi.getRoles()) : Promise.resolve(null),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} user${result.data.totalCount === 1 ? "" : "s"}` : "Users"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Name, email or phone"
          filters={[{ name: "status", label: "Status", value: status, options: STATUS_OPTIONS, allLabel: "All statuses", className: "w-36" }]}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState icon={Users} title={search || status ? "No users match these filters" : "No users yet"} />
      ) : (
        <>
          <UsersTable users={result.data.items} canManage={canManage} roles={roles?.ok ? roles.data : []} />
          <Pagination
            basePath={basePath}
            query={{ q: search, status }}
            offset={offset}
            limit={SECURITY_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
