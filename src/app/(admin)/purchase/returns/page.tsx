import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Undo2 } from "lucide-react";
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
import { deleteReturnFromListAction } from "@/modules/purchase/actions/returns";
import { purchaseApi } from "@/modules/purchase/api";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION, purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase Returns" };

const basePath = "/purchase/returns";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "supplier", "reason", "settlement", "total", "status"] as const;
type Sort = (typeof SORTS)[number];
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
        compact
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
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <ReturnList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (return no, supplier; supplier, status, dates), sorts and pages; 30 per page, newest
// first unless a column is chosen.
async function ReturnList({ searchParams }: Pick<Props, "searchParams">) {
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
    tryApi(() => purchaseApi.returns.list({ search, status, supplierId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
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
          {result.ok ? `${formatNumber(result.data.totalCount)} return${result.data.totalCount === 1 ? "" : "s"}` : "Returns"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Return no, supplier"
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
          icon={Undo2}
          title={filtered ? "No returns match these filters" : "No purchase returns yet"}
          description={filtered ? undefined : "Return goods from a posted invoice or goods receipt, or record a free-standing return."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Return", "number")}
                {header("Date", "date")}
                {header("Supplier", "supplier")}
                {header("Reason", "reason")}
                {header("Settlement", "settlement")}
                {header("Total", "total", "text-right")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
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
                  {canManage && (
                    <TD className="text-right">
                      {/* Only a draft can be changed or deleted; a posted return is cancelled from its page. */}
                      {item.status !== "Draft" ? (
                        <LockedRowActions
                          reason={
                            item.status === "Posted"
                              ? "A posted return can't be edited or deleted: its stock and settlement are recorded. Open it to cancel it."
                              : "A cancelled return can't be edited or deleted."
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Link
                            href={`${basePath}/${item.id}/edit`}
                            className={rowIconAction("edit")}
                            title={`Edit ${item.returnNo}`}
                            aria-label={`Edit ${item.returnNo}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <ConfirmDeleteButton
                            iconOnly
                            action={deleteReturnFromListAction.bind(null, item.id)}
                            itemLabel={`draft return ${item.returnNo}`}
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
