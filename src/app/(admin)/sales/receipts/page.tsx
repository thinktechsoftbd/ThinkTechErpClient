import type { Metadata } from "next";
import Link from "next/link";
import { Ban, HandCoins, Plus } from "lucide-react";
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
import { canManageSales } from "@/modules/sales/access";
import { cancelReceiptAction } from "@/modules/sales/actions/receipts";
import { salesApi } from "@/modules/sales/api";
import { ChequeStatusBadge } from "@/modules/sales/components/receipts/cheque-status-badge";
import { getCustomerOptions } from "@/modules/sales/queries";
import { SALES_MANAGE_PERMISSION, salesLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Customer Receipts" };

const basePath = "/sales/receipts";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "customer", "method", "amount", "allocated", "status"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/sales/receipts">;

const STATUS_OPTIONS = [
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

/** A receipt is posted when it is recorded, so it is never edited; it is cancelled instead (and a new one recorded). */
const NO_EDIT = "A receipt is posted when it is recorded, so it can't be edited or deleted. Cancel it with the red icon and record a new one.";

export default function CustomerReceiptsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Customer Receipts"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sales", href: "/sales" }, { label: "Customer Receipts" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SALES_MANAGE_PERMISSION}>
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

// Server-side: the API filters (number, customer name, code or mobile, reference; customer, status, dates), sorts
// and pages; 30 per page, newest first unless a column is chosen.
async function ReceiptList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const statusParam = firstParam(query.status);
  const status = STATUS_OPTIONS.some((option) => option.value === statusParam) ? statusParam : undefined;
  const customerParam = firstParam(query.customer);
  const customerId = customerParam ? (parseIdParam(customerParam) ?? undefined) : undefined;
  // A malformed date in the URL is ignored rather than sent to the API (which refuses it).
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, customers, result] = await Promise.all([
    requireSession(),
    getCustomerOptions(),
    tryApi(() => salesApi.receipts.list({ search, status, customerId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || customerId || from || to);
  const canManage = canManageSales(session);
  const filterQuery = { q: search, status, customer: customerId === undefined ? undefined : String(customerId), from, to };
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
          placeholder="No, customer, mobile, reference"
          filters={[
            {
              name: "customer",
              label: "Customer",
              value: filterQuery.customer,
              options: (customers.ok ? customers.data : []).map((customer) => ({ value: String(customer.id), label: customer.name })),
              allLabel: "All customers",
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
          icon={HandCoins}
          title={filtered ? "No receipts match these filters" : "No customer receipts yet"}
          description={filtered ? undefined : "Record a money receipt to collect a customer's dues."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Receipt", "number")}
                {header("Date", "date")}
                {header("Customer", "customer")}
                {header("Method", "method")}
                {header("Amount", "amount", "text-right")}
                {header("Allocated", "allocated", "text-right")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((receipt) => {
                const isRefund = receipt.receiptType === "Refund";
                return (
                  <TR key={receipt.id}>
                    <TD>
                      <Link href={`${basePath}/${receipt.id}`} className="font-medium text-brand-500 hover:underline">
                        {receipt.receiptNo}
                      </Link>
                      {isRefund && (
                        <span className="mt-0.5 block">
                          <Badge tone="brand">Refund</Badge>
                        </span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap">{formatDate(receipt.receiptDate)}</TD>
                    <TD>
                      {receipt.customerName}
                      {receipt.customerMobile && <span className="block text-xs text-gray-500">{receipt.customerMobile}</span>}
                    </TD>
                    <TD>
                      {salesLabel(receipt.paymentMethod)}
                      {(receipt.paymentProvider || receipt.referenceNo) && (
                        <span className="block text-xs text-gray-500">
                          {[receipt.paymentProvider, receipt.referenceNo].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {formatAmount(receipt.amount)}
                      {receipt.currency && <span className="ml-1 text-xs text-gray-500">{receipt.currency}</span>}
                      {receipt.taxDeductedAmount > 0 && (
                        <span className="block text-xs text-gray-500">+ {formatAmount(receipt.taxDeductedAmount)} tax deducted</span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums">
                      {isRefund ? (
                        "—"
                      ) : (
                        <>
                          {formatAmount(receipt.allocatedAmount)}
                          {receipt.unallocatedAmount > 0 && (
                            <span className="block text-xs text-gray-500">{formatAmount(receipt.unallocatedAmount)} advance</span>
                          )}
                        </>
                      )}
                    </TD>
                    <TD>
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <DocumentStatusBadge status={receipt.status} />
                        <ChequeStatusBadge status={receipt.chequeStatus} />
                      </span>
                    </TD>
                    {canManage && (
                      <TD className="text-right">
                        {receipt.status === "Posted" ? (
                          // Locked (a receipt is never edited or deleted); Cancel undoes it, as on its page.
                          <span className="inline-flex items-center gap-1">
                            <LockedRowActions reason={NO_EDIT} />
                            <ConfirmActionButton
                              action={cancelReceiptAction.bind(null, receipt.id)}
                              label={`${isRefund ? "Cancel refund" : "Cancel receipt"} ${receipt.receiptNo}`}
                              icon={<Ban className="size-4" aria-hidden />}
                              tone="delete"
                              title={isRefund ? "Cancel refund" : "Cancel receipt"}
                              message={
                                isRefund
                                  ? `Cancel refund ${receipt.receiptNo}? The customer's advance is restored.`
                                  : `Cancel receipt ${receipt.receiptNo}? It is taken off its invoices, which become due again from the customer.`
                              }
                              confirmLabel={isRefund ? "Cancel refund" : "Cancel receipt"}
                              pendingLabel="Cancelling…"
                              danger
                            />
                          </span>
                        ) : (
                          <LockedRowActions reason="A cancelled receipt can't be edited or cancelled again." />
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
