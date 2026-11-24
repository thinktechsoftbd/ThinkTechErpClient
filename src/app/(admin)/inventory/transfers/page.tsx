import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Pencil, Plus, Truck } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { LockedRowActions } from "@/core/crud/locked-row-actions";
import { PermissionOnly } from "@/core/crud/permission-only";
import { rowIconAction } from "@/core/crud/row-action";
import { SortHeader, type SortDirection } from "@/core/crud/sort-header";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { canManageInventory } from "@/modules/inventory/access";
import { deleteTransferFromListAction } from "@/modules/inventory/actions/documents";
import { inventoryApi } from "@/modules/inventory/api";
import { readDocumentFilters, warehouseFilterOptions } from "@/modules/inventory/components/documents/list-filters";
import { inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Stock Transfers" };

const basePath = "/inventory/transfers";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "from", "to", "lines", "value", "status"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/inventory/transfers">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "InTransit", label: "In transit" },
  { value: "Received", label: "Received" },
  { value: "Cancelled", label: "Cancelled" },
];

/** Why a transfer that left the draft stage can't be edited or deleted, by its status. */
const LOCKED_REASON: Record<string, string> = {
  InTransit: "A dispatched transfer can't be edited or deleted: its stock has left the warehouse. Open it to receive or cancel it.",
  Received: "A received transfer can't be edited or deleted: its stock has moved.",
  Cancelled: "A cancelled transfer can't be edited or deleted.",
};

export default function StockTransfersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Stock Transfers"
        compact
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
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <TransferList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (number or remarks; warehouse either side, status, dates), sorts and pages; 30 per
// page, newest first unless a column is chosen.
async function TransferList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const filters = readDocumentFilters(query);
  const { warehouseId, from, to, offset } = filters;
  const search = filters.search?.trim() || undefined;
  const status = STATUS_OPTIONS.some((option) => option.value === filters.status) ? filters.status : undefined;
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";

  const [session, options, result] = await Promise.all([
    requireSession(),
    getInventoryOptions(),
    tryApi(() => inventoryApi.transfers.list({ search, status, warehouseId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || warehouseId || from || to);
  const warehouses = options.ok ? options.data.warehouses : [];
  const canManage = canManageInventory(session);
  const filterQuery = { q: search, status, warehouse: warehouseId === undefined ? undefined : String(warehouseId), from, to };
  const sorting = { sort: sort ?? "", direction, basePath, query: filterQuery };
  const header = (label: string, column: Sort, className?: string) => (
    <SortHeader label={label} column={column} className={className} {...sorting} />
  );

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 xl:flex-row xl:items-center xl:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} transfer${result.data.totalCount === 1 ? "" : "s"}` : "Transfers"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Number or remarks"
          filters={[
            ...(warehouses.length > 1
              ? [
                  {
                    name: "warehouse",
                    label: "Warehouse",
                    value: filterQuery.warehouse,
                    options: warehouseFilterOptions(warehouses),
                    allLabel: "Any warehouse",
                    className: "w-44",
                    searchable: true,
                  },
                ]
              : []),
            { name: "status", label: "Status", value: status, options: STATUS_OPTIONS, allLabel: "All statuses", className: "w-32" },
          ]}
          dateRange={{ from, to }}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
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
                {header("Number", "number")}
                {header("Date", "date")}
                {header("From", "from")}
                {header("To", "to")}
                {header("Lines", "lines", "text-right")}
                {header("Value", "value", "text-right")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
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
                    <span className="inline-flex items-center gap-1.5">
                      {transfer.fromWarehouseName}
                      <ArrowRight className="size-3.5 text-gray-400" aria-label="to" />
                    </span>
                  </TD>
                  <TD>{transfer.toWarehouseName}</TD>
                  <TD className="text-right tabular-nums">{formatNumber(transfer.lineCount)}</TD>
                  <TD className="text-right tabular-nums">{transfer.status === "Draft" ? "—" : formatAmount(transfer.totalValue)}</TD>
                  <TD>
                    <DocumentStatusBadge status={transfer.status} />
                  </TD>
                  {canManage && (
                    <TD className="text-right">
                      {/* Only a draft can be changed or deleted; a dispatched one is received or cancelled from its page. */}
                      {transfer.status !== "Draft" ? (
                        <LockedRowActions reason={LOCKED_REASON[transfer.status] ?? "This transfer can't be edited or deleted."} />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Link
                            href={`${basePath}/${transfer.id}/edit`}
                            className={rowIconAction("edit")}
                            title={`Edit ${transfer.transferNo}`}
                            aria-label={`Edit ${transfer.transferNo}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <ConfirmDeleteButton
                            iconOnly
                            action={deleteTransferFromListAction.bind(null, transfer.id)}
                            itemLabel={`draft transfer ${transfer.transferNo}`}
                          />
                        </span>
                      )}
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath={basePath}
            query={{ ...filterQuery, sort, dir: direction === "asc" ? undefined : direction }}
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
