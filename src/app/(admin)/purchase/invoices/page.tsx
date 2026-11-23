import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Receipt } from "lucide-react";
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
import { deleteInvoiceFromListAction } from "@/modules/purchase/actions/invoices";
import { purchaseApi } from "@/modules/purchase/api";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase Invoices" };

const basePath = "/purchase/invoices";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "supplier", "type", "total", "due", "payment", "status"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/purchase/invoices">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];
const TYPE_OPTIONS = [
  { value: "Cash", label: "Cash" },
  { value: "Credit", label: "Credit" },
];
const PAYMENT_OPTIONS = [
  { value: "Unpaid", label: "Unpaid" },
  { value: "PartiallyPaid", label: "Partially paid" },
  { value: "Paid", label: "Paid" },
];

/** A query value only when it is one of the allowed ones (the URL may hold anything). */
function oneOf(value: string | undefined, options: { value: string }[]) {
  return value && options.some((option) => option.value === value) ? value : undefined;
}

export default function PurchaseInvoicesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Purchase Invoices"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Purchase Invoices" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New purchase
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={9} />}>
          <InvoiceList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (number, supplier, bill no; supplier, type, payment, status, dates), sorts and
// pages; 30 per page, newest first unless a column is chosen.
async function InvoiceList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const status = oneOf(firstParam(query.status), STATUS_OPTIONS);
  const purchaseType = oneOf(firstParam(query.type), TYPE_OPTIONS);
  const paymentStatus = oneOf(firstParam(query.payment), PAYMENT_OPTIONS);
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
    tryApi(() =>
      purchaseApi.invoices.list({ search, status, purchaseType, paymentStatus, supplierId, from, to, sort, direction, limit: PAGE_SIZE, offset }),
    ),
  ]);
  const filtered = Boolean(search || status || purchaseType || paymentStatus || supplierId || from || to);
  const canManage = canManagePurchase(session);
  const filterQuery = {
    q: search,
    status,
    type: purchaseType,
    payment: paymentStatus,
    supplier: supplierId === undefined ? undefined : String(supplierId),
    from,
    to,
  };
  const sorting = { sort: sort ?? "", direction, basePath, query: filterQuery };
  const header = (label: string, column: Sort, className?: string) => (
    <SortHeader label={label} column={column} className={className} {...sorting} />
  );

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 xl:flex-row xl:items-center xl:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} invoice${result.data.totalCount === 1 ? "" : "s"}` : "Invoices"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="No, supplier, bill no"
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
            { name: "type", label: "Type", value: purchaseType, options: TYPE_OPTIONS, allLabel: "Cash & credit", className: "w-32" },
            { name: "payment", label: "Payment", value: paymentStatus, options: PAYMENT_OPTIONS, allLabel: "Any payment", className: "w-36" },
            { name: "status", label: "Status", value: status, options: STATUS_OPTIONS, allLabel: "All statuses", className: "w-32" },
          ]}
          dateRange={{ from, to }}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filtered ? "No invoices match these filters" : "No purchases yet"}
          description={filtered ? undefined : "Record a cash or credit purchase with New purchase."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Invoice", "number")}
                {header("Date", "date")}
                {header("Supplier", "supplier")}
                {header("Type", "type")}
                {header("Total", "total", "text-right")}
                {header("Due", "due", "text-right")}
                {header("Payment", "payment")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((invoice) => (
                <TR key={invoice.id}>
                  <TD>
                    <Link href={`${basePath}/${invoice.id}`} className="font-medium text-brand-500 hover:underline">
                      {invoice.invoiceNo}
                    </Link>
                    {invoice.supplierInvoiceNo && <span className="block text-xs text-gray-500">Bill {invoice.supplierInvoiceNo}</span>}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(invoice.invoiceDate)}</TD>
                  <TD>
                    {invoice.supplierName ?? "Walk-in supplier"}
                    {!invoice.supplierId && <span className="block text-xs text-gray-500">walk-in</span>}
                  </TD>
                  <TD>
                    <DocumentStatusBadge status={invoice.purchaseType} />
                  </TD>
                  <TD className="text-right tabular-nums">
                    {formatAmount(invoice.totalAmount)}
                    {invoice.currency && <span className="ml-1 text-xs text-gray-500">{invoice.currency}</span>}
                  </TD>
                  <TD className="text-right tabular-nums">{invoice.dueAmount > 0 ? formatAmount(invoice.dueAmount) : "—"}</TD>
                  <TD>{invoice.status === "Posted" ? <DocumentStatusBadge status={invoice.paymentStatus} /> : "—"}</TD>
                  <TD>
                    <DocumentStatusBadge status={invoice.status} />
                  </TD>
                  {canManage && (
                    <TD className="text-right">
                      {/* Only a draft can be changed or deleted; a posted invoice is cancelled from its page. */}
                      {invoice.status !== "Draft" ? (
                        <LockedRowActions
                          reason={
                            invoice.status === "Posted"
                              ? "A posted invoice can't be edited or deleted: its stock and payment are recorded. Open it to cancel it."
                              : "A cancelled invoice can't be edited or deleted."
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Link
                            href={`${basePath}/${invoice.id}/edit`}
                            className={rowIconAction("edit")}
                            title={`Edit ${invoice.invoiceNo}`}
                            aria-label={`Edit ${invoice.invoiceNo}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <ConfirmDeleteButton
                            iconOnly
                            action={deleteInvoiceFromListAction.bind(null, invoice.id)}
                            itemLabel={`draft invoice ${invoice.invoiceNo}`}
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
