import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Pencil, Plus } from "lucide-react";
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
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { dateParam } from "@/modules/inventory/components/reports/report-parts";
import { canManagePurchase } from "@/modules/purchase/access";
import { deleteOrderFromListAction } from "@/modules/purchase/actions/orders";
import { purchaseApi } from "@/modules/purchase/api";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase Orders" };

const basePath = "/purchase/orders";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "supplier", "warehouse", "expected", "total", "status"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/purchase/orders">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Approved", label: "Approved" },
  { value: "PartiallyReceived", label: "Partially received" },
  { value: "Received", label: "Received" },
  { value: "Closed", label: "Closed" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function PurchaseOrdersPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Purchase Orders"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Purchase Orders" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New order
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <OrderList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (order no, supplier, reference; supplier, status, dates), sorts and pages; 30 per
// page, newest first unless a column is chosen.
async function OrderList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const statusParam = firstParam(query.status);
  const status = STATUS_OPTIONS.some((option) => option.value === statusParam) ? statusParam : undefined;
  const supplierParam = firstParam(query.supplier);
  const supplierId = supplierParam ? (parseIdParam(supplierParam) ?? undefined) : undefined;
  // A malformed date in the URL is ignored rather than sent to the API (which refuses it).
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, suppliers, result] = await Promise.all([
    requireSession(),
    getSupplierOptions(),
    tryApi(() => purchaseApi.orders.list({ search, status, supplierId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || supplierId || from || to);
  const canManage = canManagePurchase(session);
  const filterQuery = { q: search, status, supplier: supplierId === undefined ? undefined : String(supplierId), from, to };
  const sorting = { sort: sort ?? "", direction, basePath, query: filterQuery };
  const header = (label: string, column: Sort, className?: string) => (
    <SortHeader label={label} column={column} className={className} {...sorting} />
  );

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 xl:flex-row xl:items-center xl:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} order${result.data.totalCount === 1 ? "" : "s"}` : "Orders"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Order no, supplier, reference"
          filters={[
            {
              name: "supplier",
              label: "Supplier",
              value: filterQuery.supplier,
              options: (suppliers.ok ? suppliers.data : []).map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
              allLabel: "All suppliers",
              className: "w-44",
              searchable: true,
            },
            { name: "status", label: "Status", value: status, options: STATUS_OPTIONS, allLabel: "All statuses", className: "w-40" },
          ]}
          dateRange={{ from, to }}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filtered ? "No orders match these filters" : "No purchase orders yet"}
          description={filtered ? undefined : "Most purchases go straight onto an invoice. Use an order when you order first and the goods come later."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Order", "number")}
                {header("Date", "date")}
                {header("Supplier", "supplier")}
                {header("Deliver to", "warehouse")}
                {header("Expected", "expected")}
                {header("Total", "total", "text-right")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((order) => (
                <TR key={order.id}>
                  <TD>
                    <Link href={`${basePath}/${order.id}`} className="font-medium text-brand-500 hover:underline">
                      {order.orderNo}
                    </Link>
                    {order.supplierReference && <span className="block text-xs text-gray-500">Ref {order.supplierReference}</span>}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(order.orderDate)}</TD>
                  <TD>{order.supplierName}</TD>
                  <TD>{order.warehouseName}</TD>
                  <TD className="whitespace-nowrap">{order.expectedDate ? formatDate(order.expectedDate) : "—"}</TD>
                  <TD className="text-right tabular-nums">
                    {formatAmount(order.totalAmount)}
                    {order.currency && <span className="ml-1 text-xs text-gray-500">{order.currency}</span>}
                  </TD>
                  <TD>
                    <DocumentStatusBadge status={order.status} />
                  </TD>
                  {canManage && (
                    <TD className="text-right">
                      {/* Only a draft can be changed or deleted; an approved order is closed or cancelled from its page. */}
                      {order.status !== "Draft" ? (
                        <LockedRowActions
                          reason={
                            order.status === "Cancelled" || order.status === "Closed"
                              ? `A ${order.status === "Closed" ? "closed" : "cancelled"} order can't be edited or deleted.`
                              : "An approved order can't be edited or deleted. Open it to close or cancel it."
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Link
                            href={`${basePath}/${order.id}/edit`}
                            className={rowIconAction("edit")}
                            title={`Edit ${order.orderNo}`}
                            aria-label={`Edit ${order.orderNo}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <ConfirmDeleteButton
                            iconOnly
                            action={deleteOrderFromListAction.bind(null, order.id)}
                            itemLabel={`draft order ${order.orderNo}`}
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
