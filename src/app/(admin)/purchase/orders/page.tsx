import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Input } from "@/core/forms/fields";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { purchaseApi } from "@/modules/purchase/api";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase Orders" };

const basePath = "/purchase/orders";
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
        description="Optional: order from a supplier first, then receive the goods or buy against the order with an invoice."
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
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <OrderList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function OrderList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const status = firstParam(query.status);
  const supplierParam = firstParam(query.supplier);
  const supplierId = supplierParam ? (parseIdParam(supplierParam) ?? undefined) : undefined;
  const from = firstParam(query.from);
  const to = firstParam(query.to);
  const offset = parseOffset(query.offset);

  const [suppliers, result] = await Promise.all([
    getSupplierOptions(),
    tryApi(() => purchaseApi.orders.list({ search, status, supplierId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || supplierId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} order(s)` : "Orders"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Order no, supplier, reference" filtered={filtered}>
            <FilterSelect
              name="supplier"
              label="Supplier"
              value={supplierId ? String(supplierId) : undefined}
              options={(suppliers.ok ? suppliers.data : []).map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All suppliers"
              className="w-44"
            />
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-40" />
            <div className="w-36">
              <Input type="date" name="from" defaultValue={from} aria-label="From date" title="From date" className="h-9 px-3" />
            </div>
            <div className="w-36">
              <Input type="date" name="to" defaultValue={to} aria-label="To date" title="To date" className="h-9 px-3" />
            </div>
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
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
                <TH>Order</TH>
                <TH>Date</TH>
                <TH>Supplier</TH>
                <TH>Deliver to</TH>
                <TH>Expected</TH>
                <TH className="text-right">Total</TH>
                <TH>Status</TH>
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
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath={basePath}
            query={{ q: search, status, supplier: supplierId, from, to }}
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
