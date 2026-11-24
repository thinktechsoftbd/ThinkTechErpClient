import type { Metadata } from "next";
import Link from "next/link";
import { PackageCheck, Pencil, Plus } from "lucide-react";
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
import { Badge } from "@/core/ui/badge";
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
import { deleteReceiptFromListAction } from "@/modules/purchase/actions/receipts";
import { purchaseApi } from "@/modules/purchase/api";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Goods Receipts" };

const basePath = "/purchase/goods-receipts";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "supplier", "warehouse", "value", "billed", "status"] as const;
type Sort = (typeof SORTS)[number];
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
        compact
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
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <ReceiptList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (receipt no, supplier, challan no; supplier, status, dates), sorts and pages; 30 per
// page, newest first unless a column is chosen.
async function ReceiptList({ searchParams }: Pick<Props, "searchParams">) {
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
    tryApi(() => purchaseApi.receipts.list({ search, status, supplierId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
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
          {result.ok ? `${formatNumber(result.data.totalCount)} receipt${result.data.totalCount === 1 ? "" : "s"}` : "Receipts"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="No, supplier, challan no"
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
            { name: "status", label: "Status", value: status, options: STATUS_OPTIONS, allLabel: "All statuses", className: "w-32" },
          ]}
          dateRange={{ from, to }}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
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
                {header("Receipt", "number")}
                {header("Date", "date")}
                {header("Supplier", "supplier")}
                {header("Warehouse", "warehouse")}
                {header("Value", "value", "text-right")}
                {header("Billed", "billed")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
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
                  {canManage && (
                    <TD className="text-right">
                      {/* Only a draft can be changed or deleted; a posted receipt is cancelled from its page. */}
                      {receipt.status !== "Draft" ? (
                        <LockedRowActions
                          reason={
                            receipt.status === "Posted"
                              ? "A posted goods receipt can't be edited or deleted: its stock is in. Open it to cancel it."
                              : "A cancelled goods receipt can't be edited or deleted."
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Link
                            href={`${basePath}/${receipt.id}/edit`}
                            className={rowIconAction("edit")}
                            title={`Edit ${receipt.receiptNo}`}
                            aria-label={`Edit ${receipt.receiptNo}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <ConfirmDeleteButton
                            iconOnly
                            action={deleteReceiptFromListAction.bind(null, receipt.id)}
                            itemLabel={`draft receipt ${receipt.receiptNo}`}
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
