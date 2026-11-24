import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Plus, Wallet } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { ConfirmActionButton } from "@/core/crud/confirm-action-button";
import { LockedRowActions } from "@/core/crud/locked-row-actions";
import { PermissionOnly } from "@/core/crud/permission-only";
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
import { cancelPaymentAction } from "@/modules/purchase/actions/payments";
import { purchaseApi } from "@/modules/purchase/api";
import { getSupplierOptions } from "@/modules/purchase/queries";
import { PURCHASE_MANAGE_PERMISSION, purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Supplier Payments" };

const basePath = "/purchase/payments";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "supplier", "method", "amount", "unallocated", "status"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/purchase/payments">;

const STATUS_OPTIONS = [
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

/** A payment is posted when it is recorded, so it is never edited or deleted; it is cancelled instead. */
const POSTED_REASON = "A payment is posted when it is recorded, so it can't be edited or deleted. Cancel it with the red icon and record a new one.";

export default function SupplierPaymentsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Supplier Payments"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase", href: "/purchase" }, { label: "Supplier Payments" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New payment
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <PaymentList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (payment no, supplier, reference; supplier, status, dates), sorts and pages; 30 per
// page, newest first unless a column is chosen.
async function PaymentList({ searchParams }: Pick<Props, "searchParams">) {
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
    tryApi(() => purchaseApi.payments.list({ search, status, supplierId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
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
          {result.ok ? `${formatNumber(result.data.totalCount)} payment${result.data.totalCount === 1 ? "" : "s"}` : "Payments"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="No, supplier, reference"
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
          icon={Wallet}
          title={filtered ? "No payments match these filters" : "No supplier payments yet"}
          description={filtered ? undefined : "Record a payment to settle a supplier's dues."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Payment", "number")}
                {header("Date", "date")}
                {header("Supplier", "supplier")}
                {header("Method", "method")}
                {header("Amount", "amount", "text-right")}
                {header("Unallocated", "unallocated", "text-right")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((payment) => {
                const isRefund = payment.paymentType === "Refund";
                return (
                  <TR key={payment.id}>
                    <TD>
                      <Link href={`${basePath}/${payment.id}`} className="font-medium text-brand-500 hover:underline">
                        {payment.paymentNo}
                      </Link>
                      {isRefund && (
                        <span className="mt-0.5 block">
                          <Badge tone="brand">Refund</Badge>
                        </span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap">{formatDate(payment.paymentDate)}</TD>
                    <TD>{payment.supplierName}</TD>
                    <TD>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {purchaseLabel(payment.paymentMethod)}
                        {payment.chequeStatus && <DocumentStatusBadge status={payment.chequeStatus} />}
                      </span>
                      {(payment.paymentProvider || payment.referenceNo) && (
                        <span className="block text-xs text-gray-500">{[payment.paymentProvider, payment.referenceNo].filter(Boolean).join(" · ")}</span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatAmount(payment.amount)}
                      {payment.currency && <span className="ml-1 text-xs text-gray-500">{payment.currency}</span>}
                      {payment.taxDeductedAmount > 0 && (
                        <span className="block text-xs text-gray-500">+ {formatAmount(payment.taxDeductedAmount)} tax deducted</span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {payment.paymentType === "Payment" && payment.unallocatedAmount > 0 ? formatAmount(payment.unallocatedAmount) : "—"}
                    </TD>
                    <TD>
                      <DocumentStatusBadge status={payment.status} />
                    </TD>
                    {canManage && (
                      <TD className="text-right">
                        {payment.status === "Posted" ? (
                          // Locked (never edited or deleted); Cancel undoes it, as on its page.
                          <span className="inline-flex items-center gap-1">
                            <LockedRowActions reason={POSTED_REASON} />
                            <ConfirmActionButton
                              action={cancelPaymentAction.bind(null, payment.id)}
                              label={`${isRefund ? "Cancel refund" : "Cancel payment"} ${payment.paymentNo}`}
                              icon={<Ban className="size-4" aria-hidden />}
                              tone="delete"
                              title={isRefund ? "Cancel refund" : "Cancel payment"}
                              message={
                                isRefund
                                  ? `Cancel refund ${payment.paymentNo}? The supplier's advance is restored.`
                                  : `Cancel payment ${payment.paymentNo}? It is taken off its invoices, which become due again.`
                              }
                              confirmLabel={isRefund ? "Cancel refund" : "Cancel payment"}
                              pendingLabel="Cancelling…"
                              danger
                            />
                          </span>
                        ) : (
                          <LockedRowActions reason="A cancelled payment can't be edited, deleted or cancelled again." />
                        )}
                      </TD>
                    )}
                  </TR>
                );
              })}
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
