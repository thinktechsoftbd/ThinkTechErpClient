import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { CRUD_PAGE_SIZE, FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { DocumentStatusBadge } from "@/core/documents/document-status";
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
import { salesApi } from "@/modules/sales/api";
import { getCustomerOptions } from "@/modules/sales/queries";
import { SALES_MANAGE_PERMISSION, customerLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Sales" };

const basePath = "/sales/invoices";
type Props = PageProps<"/sales/invoices">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Posted", label: "Completed" },
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

export default function SalesInvoicesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Sales"
        description="Cash and credit sales. Completing a sale takes the stock out; a credit sale adds the due to the customer's account."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Sales" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SALES_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New sale
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <InvoiceList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function InvoiceList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const status = firstParam(query.status);
  const saleType = firstParam(query.type);
  const paymentStatus = firstParam(query.payment);
  const customerParam = firstParam(query.customer);
  const customerId = customerParam ? (parseIdParam(customerParam) ?? undefined) : undefined;
  const from = firstParam(query.from);
  const to = firstParam(query.to);
  const offset = parseOffset(query.offset);

  const [customers, result] = await Promise.all([
    getCustomerOptions(),
    tryApi(() => salesApi.invoices.list({ search, status, saleType, paymentStatus, customerId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || saleType || paymentStatus || customerId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} sale(s)` : "Sales"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="No, customer, mobile" filtered={filtered}>
            <FilterSelect
              name="customer"
              label="Customer"
              value={customerId ? String(customerId) : undefined}
              options={(customers.ok ? customers.data : []).map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All customers"
              className="w-44"
            />
            <FilterSelect name="type" label="Type" value={saleType} options={TYPE_OPTIONS} allLabel="Cash & credit" className="w-32" />
            <FilterSelect name="payment" label="Payment" value={paymentStatus} options={PAYMENT_OPTIONS} allLabel="Any payment" className="w-36" />
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-32" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={filtered ? "No sales match these filters" : "No sales yet"}
          description={filtered ? undefined : "Sell at the counter with New sale."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <TH>Invoice</TH>
                <TH>Date</TH>
                <TH>Customer</TH>
                <TH>Type</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Due</TH>
                <TH>Payment</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((invoice) => (
                <TR key={invoice.id}>
                  <TD>
                    <Link href={`${basePath}/${invoice.id}`} className="font-medium text-brand-500 hover:underline">
                      {invoice.invoiceNo}
                    </Link>
                    <span className="block text-xs text-gray-500">{invoice.warehouseName}</span>
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(invoice.invoiceDate)}</TD>
                  <TD>
                    {customerLabel(invoice)}
                    <span className="block text-xs text-gray-500">
                      {invoice.customerId ? invoice.customerMobile : ["walk-in", invoice.customerMobile].filter(Boolean).join(" · ")}
                    </span>
                  </TD>
                  <TD>
                    <DocumentStatusBadge status={invoice.saleType} />
                  </TD>
                  <TD className="text-right tabular-nums">{formatAmount(invoice.totalAmount)}</TD>
                  <TD className="text-right tabular-nums">{invoice.status === "Posted" && invoice.dueAmount > 0 ? formatAmount(invoice.dueAmount) : "—"}</TD>
                  <TD>{invoice.status === "Posted" ? <DocumentStatusBadge status={invoice.paymentStatus} /> : "—"}</TD>
                  <TD>
                    <DocumentStatusBadge status={invoice.status} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath={basePath}
            query={{ q: search, status, type: saleType, payment: paymentStatus, customer: customerId, from, to }}
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
