import type { Metadata } from "next";
import Link from "next/link";
import { HandCoins, Plus } from "lucide-react";
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
import { salesApi } from "@/modules/sales/api";
import { ChequeStatusBadge } from "@/modules/sales/components/receipts/cheque-status-badge";
import { getCustomerOptions } from "@/modules/sales/queries";
import { SALES_MANAGE_PERMISSION, salesLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Customer Receipts" };

const basePath = "/sales/receipts";
type Props = PageProps<"/sales/receipts">;

const STATUS_OPTIONS = [
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function CustomerReceiptsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Customer Receipts"
        description="Money received from customers (and advances refunded to them). Receipts collect dues on open invoices, oldest due first or as allocated."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Customer Receipts" }]}
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
  const customerParam = firstParam(query.customer);
  const customerId = customerParam ? (parseIdParam(customerParam) ?? undefined) : undefined;
  // A malformed date in the URL is ignored rather than sent to the API (which refuses it).
  const from = dateParam(query.from);
  const to = dateParam(query.to);
  const offset = parseOffset(query.offset);

  const [customers, result] = await Promise.all([
    getCustomerOptions(),
    tryApi(() => salesApi.receipts.list({ search, status, customerId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || customerId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} receipt(s)` : "Receipts"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="No, customer, mobile, reference" filtered={filtered}>
            <FilterSelect
              name="customer"
              label="Customer"
              value={customerId ? String(customerId) : undefined}
              options={(customers.ok ? customers.data : []).map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All customers"
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
          icon={HandCoins}
          title={filtered ? "No receipts match these filters" : "No customer receipts yet"}
          description={filtered ? undefined : "Record a money receipt to collect a customer's dues."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Receipt</TH>
                <TH>Date</TH>
                <TH>Customer</TH>
                <TH>Method</TH>
                <TH className="text-right">Amount</TH>
                <TH className="text-right">Allocated</TH>
                <TH>Status</TH>
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
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <Pagination
            basePath={basePath}
            query={{ q: search, status, customer: customerId, from, to }}
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
