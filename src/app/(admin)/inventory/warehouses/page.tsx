import type { Metadata } from "next";
import { Warehouse } from "lucide-react";
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
import { saveWarehouseAction } from "@/modules/inventory/actions/setup";
import { inventoryApi } from "@/modules/inventory/api";
import { WarehouseFields } from "@/modules/inventory/components/setup/fields";
import { WarehousesTable } from "@/modules/inventory/components/setup/tables";
import { getInventorySettings } from "@/modules/inventory/queries";
import { INVENTORY_MANAGE_PERMISSION, WAREHOUSE_TYPES } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Warehouses" };

const basePath = "/inventory/warehouses";
const PAGE_SIZE = 30;
const SORTS = ["code", "name", "type", "stock", "status", "updated"] as const;
type Sort = (typeof SORTS)[number];
const TYPE_OPTIONS = WAREHOUSE_TYPES.map((type) => ({ value: type, label: type }));
type Props = PageProps<"/inventory/warehouses">;

export default function WarehousesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Warehouses"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Warehouses" }]}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <FormModalButton
                mode="create"
                label="New warehouse"
                title="New warehouse"
                action={saveWarehouseAction.bind(null, null)}
                submitLabel="Create"
              >
                <WarehouseFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <WarehouseList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (code, name or local name; type; status), sorts and pages; 30 per page.
async function WarehouseList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const typeParam = firstParam(query.type);
  const warehouseType = WAREHOUSE_TYPES.find((value) => value === typeParam);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, settings, result] = await Promise.all([
    requireSession(),
    getInventorySettings(),
    tryApi(() => inventoryApi.warehouses.list({ search, warehouseType, isActive, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || warehouseType !== undefined || isActive !== undefined;
  const active = isActive === undefined ? undefined : String(isActive);

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} warehouse${result.data.totalCount === 1 ? "" : "s"}` : "Warehouses"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Code, name or local name"
          filters={[
            { name: "type", label: "Type", value: warehouseType, options: TYPE_OPTIONS, allLabel: "All types" },
            { name: "active", label: "Status", value: activeParam, options: ACTIVE_FILTER_OPTIONS, allLabel: "All statuses" },
          ]}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={filtered ? "No warehouses match these filters" : "No warehouses yet"}
          description={filtered ? undefined : "Add your shop and godown with New warehouse before entering stock."}
        />
      ) : (
        <>
          <WarehousesTable
            rows={result.data.items}
            currency={settings.ok ? settings.data.baseCurrency : null}
            canManage={canManageInventory(session)}
            sorting={{ sort: sort ?? "", direction, basePath, query: { q: search, type: warehouseType, active } }}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, type: warehouseType, active, sort, dir: direction === "asc" ? undefined : direction }}
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
