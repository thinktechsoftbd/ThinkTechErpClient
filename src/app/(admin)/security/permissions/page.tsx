import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { FormModalButton } from "@/core/crud/form-modal-button";
import type { SortDirection } from "@/core/crud/sort-header";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageSecurity } from "@/modules/security/access";
import { createPermissionFromListAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { PermissionFields } from "@/modules/security/components/forms";
import { ManageOnly } from "@/modules/security/components/manage-only";
import { PermissionsTable } from "@/modules/security/components/tables";

export const metadata: Metadata = { title: "Permissions" };

const basePath = "/security/permissions";
const PAGE_SIZE = 30;
const SORTS = ["code", "name", "description"] as const;
type Sort = (typeof SORTS)[number];

type Props = PageProps<"/security/permissions">;

export default function PermissionsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Permissions"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security", href: "/security" }, { label: "Permissions" }]}
        actions={
          <Suspense>
            <ManageOnly>
              <FormModalButton
                mode="create"
                label="New permission"
                title="New permission"
                description="MODULE.ACTION codes are granted through roles or directly to users."
                action={createPermissionFromListAction}
                submitLabel="Create permission"
              >
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <PermissionFields />
                </div>
              </FormModalButton>
            </ManageOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={4} />}>
          <PermissionsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (code or name), sorts and pages; 30 per page.
async function PermissionsList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const sortParam = firstParam(query.sort);
  const sort: Sort = SORTS.find((value) => value === sortParam) ?? "code";
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => securityApi.searchPermissions({ search, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  // Sorting and paging keep each other and the search.
  const listQuery = { q: search, sort: sort === "code" ? undefined : sort, dir: direction === "asc" ? undefined : direction };

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} permission${result.data.totalCount === 1 ? "" : "s"}` : "Permissions"}
        </h2>
        <AutoSearchToolbar basePath={basePath} search={search} placeholder="Code or name" />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState icon={KeyRound} title={search ? "No permissions match this search" : "No permissions yet"} />
      ) : (
        <>
          <PermissionsTable
            permissions={result.data.items}
            canManage={canManageSecurity(session)}
            sorting={{ sort, direction, basePath, query: { q: search } }}
          />
          <Pagination
            basePath={basePath}
            query={listQuery}
            offset={offset}
            limit={PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
