import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { cn } from "@/core/utils/cn";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { createCountAction } from "@/modules/inventory/actions/documents";
import { inventoryApi } from "@/modules/inventory/api";
import { DateRangeFilter, readDocumentFilters, warehouseFilterOptions } from "@/modules/inventory/components/documents/list-filters";
import { NewCountFields } from "@/modules/inventory/components/documents/new-count-fields";
import { inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";
import { getInventoryOptions, getInventorySettings } from "@/modules/inventory/queries";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Stock Counts" };

const basePath = "/inventory/counts";
type Props = PageProps<"/inventory/counts">;

const STATUS_OPTIONS = [
  { value: "InProgress", label: "In progress" },
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function StockCountsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Stock Counts"
        description="Count what is on the shelf and correct the system. Posting a count adjusts the differences."
        breadcrumbs={inventoryCrumbs({ label: "Stock Counts" })}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <NewCountButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <CountList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

/** "New count": pick the warehouse (and optionally a category); the API takes the system quantities. */
async function NewCountButton() {
  const [options, settings] = await Promise.all([getInventoryOptions(), getInventorySettings()]);
  if (!options.ok) return null;
  const warehouses = options.data.warehouses.filter((w) => w.isActive).map((w) => ({ id: w.id, name: w.name }));
  const categories = options.data.categories
    .filter((c) => c.isActive)
    .map((c) => ({ id: c.id, path: c.path }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return (
    <FormModalButton
      mode="create"
      label="New count"
      title="Start a stock count"
      description="The system quantities are taken now. Then count the shelf and enter what you find."
      action={createCountAction}
      submitLabel="Start count"
    >
      <NewCountFields
        warehouses={warehouses}
        categories={categories}
        defaultWarehouseId={settings.ok ? settings.data.defaultWarehouseId : null}
      />
    </FormModalButton>
  );
}

async function CountList({ searchParams }: Pick<Props, "searchParams">) {
  const { search, status, warehouseId, from, to, offset } = readDocumentFilters(await searchParams);
  const [options, result] = await Promise.all([
    getInventoryOptions(),
    tryApi(() => inventoryApi.counts.list({ search, status, warehouseId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || warehouseId || from || to);
  const warehouses = options.ok ? options.data.warehouses : [];

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} count(s)` : "Counts"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Number or remarks" filtered={filtered}>
            {warehouses.length > 1 && (
              <FilterSelect
                name="warehouse"
                label="Warehouse"
                value={warehouseId ? String(warehouseId) : undefined}
                options={warehouseFilterOptions(warehouses)}
                allLabel="All warehouses"
                className="w-40"
              />
            )}
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-36" />
            <DateRangeFilter from={from} to={to} />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={filtered ? "No counts match these filters" : "No stock counts yet"}
          description={filtered ? undefined : "Start one with New count, then enter what you find on the shelf."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Number</TH>
                <TH>Date</TH>
                <TH>Warehouse</TH>
                <TH>Category</TH>
                <TH className="text-right">Counted</TH>
                <TH className="text-right">Difference</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((count) => (
                <TR key={count.id}>
                  <TD>
                    <Link href={`${basePath}/${count.id}`} className="font-medium text-brand-500 hover:underline">
                      {count.countNo}
                    </Link>
                    {count.remarks && <span className="block max-w-64 truncate text-xs text-gray-500">{count.remarks}</span>}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(count.countDate)}</TD>
                  <TD>{count.warehouseName}</TD>
                  <TD>{count.categoryName ?? <span className="text-gray-500">All products</span>}</TD>
                  <TD className="text-right whitespace-nowrap tabular-nums">
                    {formatNumber(count.countedLineCount)} / {formatNumber(count.lineCount)}
                  </TD>
                  <TD
                    className={cn(
                      "text-right tabular-nums",
                      count.differenceValue > 0 && "text-green-700 dark:text-green-400",
                      count.differenceValue < 0 && "text-red-600 dark:text-red-400",
                    )}
                  >
                    {count.differenceValue === 0 ? "—" : formatAmount(count.differenceValue)}
                  </TD>
                  <TD>
                    <DocumentStatusBadge status={count.status} />
                    {count.stockAdjustmentId && (
                      <Link
                        href={`/inventory/adjustments/${count.stockAdjustmentId}`}
                        className="mt-0.5 block text-xs text-brand-500 hover:underline"
                      >
                        {count.stockAdjustmentNo ?? "Adjustment"}
                      </Link>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath={basePath}
            query={{ q: search, status, warehouse: warehouseId, from, to }}
            offset={offset}
            limit={CRUD_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
