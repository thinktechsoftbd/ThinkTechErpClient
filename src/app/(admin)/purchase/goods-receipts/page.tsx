import type { Metadata } from "next";
import Link from "next/link";
import { PackageCheck, Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Input } from "@/core/forms/fields";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { dateParam } from "@/modules/inventory/components/reports/report-parts";
import { purchaseApi } from "@/modules/purchase/api";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Goods Receipts" };

const basePath = "/purchase/goods-receipts";
type Props = PageProps<"/purchase/goods-receipts">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function GoodsReceiptsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Goods Receipts"
        description="Optional: goods that arrived before the supplier's bill. Posting brings the stock in; bill the receipt when the invoice comes."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Goods Receipts" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New receipt
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <ReceiptList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ReceiptList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const status = firstParam(query.status);
  const supplierParam = firstParam(query.supplier);
  const supplierId = supplierParam ? (parseIdParam(supplierParam) ?? undefined) : undefined;
  // A malformed date in the URL is ignored rather than sent to the API (which refuses it).
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [suppliers, result] = await Promise.all([
    getSupplierOptions(),
    tryApi(() => purchaseApi.receipts.list({ search, status, supplierId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || supplierId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} receipt(s)` : "Receipts"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="No, supplier, challan no" filtered={filtered}>
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
              <Input key={from ?? ""} type="date" name="from" defaultValue={from} aria-label="From date" title="From date" className="h-9 px-3" />
            </div>
            <div className="w-36">
              <Input key={to ?? ""} type="date" name="to" defaultValue={to} aria-label="To date" title="To date" className="h-9 px-3" />
            </div>
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title={filtered ? "No receipts match these filters" : "No goods receipts yet"}
          description={filtered ? undefined : "Use a goods receipt when the goods arrive before the bill; otherwise enter a purchase invoice."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Receipt</TH>
                <TH>Date</TH>
                <TH>Supplier</TH>
                <TH>Warehouse</TH>
                <TH className="text-right">Value</TH>
                <TH>Billed</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((receipt) => (
                <TR key={receipt.id}>
                  <TD>
                    <Link href={`${basePath}/${receipt.id}`} className="font-medium text-brand-500 hover:underline">
                      {receipt.receiptNo}
                    </Link>
                    {(receipt.supplierChallanNo || receipt.purchaseOrderNo) && (
                      <span className="block text-xs text-gray-500">
                        {[receipt.supplierChallanNo && `Challan ${receipt.supplierChallanNo}`, receipt.purchaseOrderNo && `PO ${receipt.purchaseOrderNo}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(receipt.receiptDate)}</TD>
                  <TD>{receipt.supplierName ?? "—"}</TD>
                  <TD>{receipt.warehouseName}</TD>
                  <TD className="text-right tabular-nums">{formatAmount(receipt.totalValue)}</TD>
                  <TD>
                    {receipt.status !== "Posted" ? (
                      "—"
                    ) : receipt.isFullyInvoiced ? (
                      <Badge tone="success">Billed</Badge>
                    ) : (
                      <Badge tone="warning">To bill</Badge>
                    )}
                  </TD>
                  <TD>
                    <DocumentStatusBadge status={receipt.status} />
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
