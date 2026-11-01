import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Undo2 } from "lucide-react";
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
import { PURCHASE_MANAGE_PERMISSION, purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase Returns" };

const basePath = "/purchase/returns";
type Props = PageProps<"/purchase/returns">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function PurchaseReturnsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Purchase Returns"
        description="Goods sent back to the supplier (debit notes). Posting takes the stock out and deducts from the dues or records the refund."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Purchase Returns" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New return
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <ReturnList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ReturnList({ searchParams }: Pick<Props, "searchParams">) {
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
    tryApi(() => purchaseApi.returns.list({ search, status, supplierId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || supplierId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} return(s)` : "Returns"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="No, supplier, invoice no" filtered={filtered}>
            <FilterSelect
              name="supplier"
              label="Supplier"
              value={supplierId ? String(supplierId) : undefined}
              options={(suppliers.ok ? suppliers.data : []).map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All suppliers"
              className="w-44"
            />
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-32" />
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
          icon={Undo2}
          title={filtered ? "No returns match these filters" : "No purchase returns yet"}
          description={filtered ? undefined : "Return goods from a posted invoice or goods receipt, or record a free-standing return."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Return</TH>
                <TH>Date</TH>
                <TH>Supplier</TH>
                <TH>Reason</TH>
                <TH>Settlement</TH>
                <TH className="text-right">Total</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <Link href={`${basePath}/${item.id}`} className="font-medium text-brand-500 hover:underline">
                      {item.returnNo}
                    </Link>
                    {(item.purchaseInvoiceNo || item.goodsReceiptNo) && (
                      <span className="block text-xs text-gray-500">
                        {item.purchaseInvoiceNo ? `Invoice ${item.purchaseInvoiceNo}` : `Receipt ${item.goodsReceiptNo}`}
                      </span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(item.returnDate)}</TD>
                  <TD>
                    {item.supplierName ?? "Walk-in supplier"}
                    {!item.supplierId && <span className="block text-xs text-gray-500">walk-in</span>}
                  </TD>
                  <TD>{purchaseLabel(item.reason)}</TD>
                  <TD>
                    {item.settlementType === "Refund" ? `Refund · ${purchaseLabel(item.refundMethod)}` : purchaseLabel(item.settlementType)}
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatAmount(item.totalAmount)}
                    {item.currency && <span className="ml-1 text-xs text-gray-500">{item.currency}</span>}
                  </TD>
                  <TD>
                    <DocumentStatusBadge status={item.status} />
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
