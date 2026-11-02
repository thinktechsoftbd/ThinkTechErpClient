import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wallet } from "lucide-react";
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
import { PURCHASE_MANAGE_PERMISSION, purchaseLabel } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Supplier Payments" };

const basePath = "/purchase/payments";
type Props = PageProps<"/purchase/payments">;

const STATUS_OPTIONS = [
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function SupplierPaymentsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Supplier Payments"
        description="Money paid to suppliers (and advances they refund). Payments settle open invoices, oldest due first or as allocated."
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
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <PaymentList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function PaymentList({ searchParams }: Pick<Props, "searchParams">) {
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
    tryApi(() => purchaseApi.payments.list({ search, status, supplierId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || supplierId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} payment(s)` : "Payments"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="No, supplier, reference" filtered={filtered}>
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
          icon={Wallet}
          title={filtered ? "No payments match these filters" : "No supplier payments yet"}
          description={filtered ? undefined : "Record a payment to settle a supplier's dues."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Payment</TH>
                <TH>Date</TH>
                <TH>Supplier</TH>
                <TH>Method</TH>
                <TH className="text-right">Amount</TH>
                <TH className="text-right">Unallocated</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((payment) => (
                <TR key={payment.id}>
                  <TD>
                    <Link href={`${basePath}/${payment.id}`} className="font-medium text-brand-500 hover:underline">
                      {payment.paymentNo}
                    </Link>
                    {payment.paymentType === "Refund" && (
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
