import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
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
        description="Accounts that can sign in to the ERP."
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
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <UsersList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function UsersList({ searchParams }: Pick<PageProps<"/security/users">, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const statusParam = firstParam(query.status);
  const status = (USER_STATUSES as readonly string[]).includes(statusParam ?? "") ? (statusParam as UserStatus) : undefined;
  const offset = parseOffset(query.offset);
  const result = await tryApi(() => securityApi.getUsers({ limit: SECURITY_PAGE_SIZE, offset, search, status }));

  return (
    <>
      <CardHeader
        title="All users"
        actions={
          // The shared toolbar keeps search, status and Search on one line next to the title.
          <ListToolbar basePath={basePath} search={search} placeholder="Name or email" filtered={Boolean(search || status)}>
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-36" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState icon={Users} title={search || status ? "No users match these filters" : "No users yet"} />
      ) : (
        <>
          <UsersTable users={result.data.items} />
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
