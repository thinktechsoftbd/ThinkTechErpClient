import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Plus, Truck } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import { DateRangeFilter, readDocumentFilters, warehouseFilterOptions } from "@/modules/inventory/components/documents/list-filters";
import { inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Stock Transfers" };

const basePath = "/inventory/transfers";
type Props = PageProps<"/inventory/transfers">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "InTransit", label: "In transit" },
  { value: "Received", label: "Received" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function StockTransfersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Stock Transfers"
        description="Move stock between warehouses, e.g. from the godown to the shop. Dispatch sends it; the other side receives it."
        breadcrumbs={inventoryCrumbs({ label: "Stock Transfers" })}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New transfer
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <TransferList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function TransferList({ searchParams }: Pick<Props, "searchParams">) {
  const { search, status, warehouseId, from, to, offset } = readDocumentFilters(await searchParams);
  const [options, result] = await Promise.all([
    getInventoryOptions(),
    tryApi(() => inventoryApi.transfers.list({ search, status, warehouseId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || warehouseId || from || to);
  const warehouses = options.ok ? options.data.warehouses : [];

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} transfer(s)` : "Transfers"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Number or remarks" filtered={filtered}>
            {warehouses.length > 1 && (
              <FilterSelect
                name="warehouse"
                label="Warehouse"
                value={warehouseId ? String(warehouseId) : undefined}
                options={warehouseFilterOptions(warehouses)}
                allLabel="Any warehouse"
                className="w-40"
              />
            )}
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-32" />
            <DateRangeFilter from={from} to={to} />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={filtered ? "No transfers match these filters" : "No transfers yet"}
          description={filtered ? undefined : "Send stock to another warehouse with New transfer."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Number</TH>
                <TH>Date</TH>
                <TH>From → To</TH>
                <TH className="text-right">Lines</TH>
                <TH className="text-right">Value</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((transfer) => (
                <TR key={transfer.id}>
                  <TD>
                    <Link href={`${basePath}/${transfer.id}`} className="font-medium text-brand-500 hover:underline">
                      {transfer.transferNo}
                    </Link>
                    {transfer.remarks && <span className="block max-w-64 truncate text-xs text-gray-500">{transfer.remarks}</span>}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(transfer.transferDate)}</TD>
                  <TD>
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {transfer.fromWarehouseName}
                      <ArrowRight className="size-3.5 text-gray-400" aria-label="to" />
                      {transfer.toWarehouseName}
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">{formatNumber(transfer.lineCount)}</TD>
                  <TD className="text-right tabular-nums">{transfer.status === "Draft" ? "—" : formatAmount(transfer.totalValue)}</TD>
                  <TD>
                    <DocumentStatusBadge status={transfer.status} />
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
