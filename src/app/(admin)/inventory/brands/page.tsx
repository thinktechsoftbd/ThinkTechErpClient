import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import type { SortDirection } from "@/core/crud/sort-header";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { canManageInventory } from "@/modules/inventory/access";
import { saveBrandAction } from "@/modules/inventory/actions/setup";
import { inventoryApi } from "@/modules/inventory/api";
import { BrandFields } from "@/modules/inventory/components/setup/fields";
import { BrandsTable } from "@/modules/inventory/components/setup/tables";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Brands" };

const basePath = "/inventory/brands";
const PAGE_SIZE = 30;
const SORTS = ["brand", "products", "status", "updated"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/inventory/brands">;

export default function BrandsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Brands"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Brands" }]}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <FormModalButton mode="create" label="New brand" title="New brand" action={saveBrandAction.bind(null, null)} submitLabel="Create">
                <BrandFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={5} />}>
          <BrandList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (name or local name, status), sorts and pages; 30 per page.
async function BrandList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => inventoryApi.brands.list({ search, isActive, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;
  const active = isActive === undefined ? undefined : String(isActive);

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} brand${result.data.totalCount === 1 ? "" : "s"}` : "Brands"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Name or local name"
          filters={[{ name: "active", label: "Status", value: activeParam, options: ACTIVE_FILTER_OPTIONS, allLabel: "All statuses" }]}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={Tag}
          title={filtered ? "No brands match these filters" : "No brands yet"}
          description={filtered ? undefined : "Add brands with New brand."}
        />
      ) : (
        <>
          <BrandsTable
            rows={result.data.items}
            canManage={canManageInventory(session)}
            sorting={{ sort: sort ?? "", direction, basePath, query: { q: search, active } }}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, active, sort, dir: direction === "asc" ? undefined : direction }}
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
