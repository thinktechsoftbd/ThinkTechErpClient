import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { InvoiceRowActions } from "@/core/documents/invoice-row-actions";
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
import { customerLabel } from "@/modules/sales/types";
import { canManageServiceInvoices } from "@/modules/warranty/access";
import {
  deletePostedServiceInvoiceFromListAction,
  deleteServiceInvoiceFromListAction,
  unpostServiceInvoiceAction,
} from "@/modules/warranty/actions/service-invoices";
import { serviceInvoiceApi } from "@/modules/warranty/service-invoice-api";
import { SERVICE_INVOICE_MANAGE_PERMISSION } from "@/modules/warranty/service-invoice-types";

export const metadata: Metadata = { title: "Service Invoices" };

const basePath = "/warranty/service-invoices";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "customer", "type", "service", "total", "due", "payment", "status"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/warranty/service-invoices">;

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

export default function ServiceInvoicesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Service Invoices"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty" }, { label: "Service Invoices" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SERVICE_INVOICE_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New service invoice
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={10} />}>
          <InvoiceList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (number, customer, mobile, service note; type, payment, status, dates), sorts and
// pages; 30 per page, newest first unless a column is chosen.
async function InvoiceList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const status = oneOf(firstParam(query.status), STATUS_OPTIONS);
  const saleType = oneOf(firstParam(query.type), TYPE_OPTIONS);
  const paymentStatus = oneOf(firstParam(query.payment), PAYMENT_OPTIONS);
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
    tryApi(() => serviceInvoiceApi.customers({ limit: 500 })),
    tryApi(() => serviceInvoiceApi.list({ search, status, saleType, paymentStatus, customerId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || saleType || paymentStatus || customerId || from || to);
  const canManage = canManageServiceInvoices(session);
  const filterQuery = {
    q: search,
    status,
    type: saleType,
    payment: paymentStatus,
    customer: customerId === undefined ? undefined : String(customerId),
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
          {result.ok ? `${formatNumber(result.data.totalCount)} service invoice${result.data.totalCount === 1 ? "" : "s"}` : "Service invoices"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="No, customer, mobile, note"
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
            { name: "type", label: "Type", value: saleType, options: TYPE_OPTIONS, allLabel: "Cash & credit", className: "w-32" },
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
          title={filtered ? "No service invoices match these filters" : "No service invoices yet"}
          description={filtered ? undefined : "Bill a repair or service with New service invoice."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Invoice", "number")}
                {header("Date", "date")}
                {header("Customer", "customer")}
                <TH>Service note</TH>
                {header("Type", "type")}
                {header("Service", "service", "text-right")}
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
                    {invoice.lineCount > 0 && (
                      <span className="block text-xs text-gray-500">
                        {invoice.lineCount} part{invoice.lineCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(invoice.invoiceDate)}</TD>
                  <TD>
                    {customerLabel(invoice)}
                    {invoice.customerId ? (
                      invoice.customerMobile && <span className="block text-xs text-gray-500">{invoice.customerMobile}</span>
                    ) : (
                      <span className="block text-xs text-gray-500">walk-in{invoice.customerMobile ? ` · ${invoice.customerMobile}` : ""}</span>
                    )}
                  </TD>
                  <TD className="max-w-64">
                    {invoice.serviceNote ? (
                      <span className="line-clamp-2 text-sm text-gray-700 dark:text-gray-300" title={invoice.serviceNote}>
                        {invoice.serviceNote}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    <DocumentStatusBadge status={invoice.saleType} />
                  </TD>
                  <TD className="text-right tabular-nums">{invoice.serviceAmount > 0 ? formatAmount(invoice.serviceAmount) : "—"}</TD>
                  <TD className="text-right tabular-nums">
                    {formatAmount(invoice.totalAmount)}
                    {invoice.currency && <span className="ml-1 text-xs text-gray-500">{invoice.currency}</span>}
                  </TD>
                  <TD className="text-right tabular-nums">{invoice.dueAmount > 0 ? formatAmount(invoice.dueAmount) : "—"}</TD>
                  <TD>{invoice.status !== "Cancelled" ? <DocumentStatusBadge status={invoice.paymentStatus} /> : "—"}</TD>
                  <TD>
                    <DocumentStatusBadge status={invoice.status} />
                  </TD>
                  {canManage && (
                    <TD className="text-right">
                      {/* Locked only while finalized (bill voucher posted) or cancelled; a posted one goes back to draft first. */}
                      <InvoiceRowActions
                        invoice={invoice}
                        noun="service invoice"
                        editHref={`${basePath}/${invoice.id}/edit`}
                        deleteDraft={deleteServiceInvoiceFromListAction.bind(null, invoice.id)}
                        unpostAndEdit={unpostServiceInvoiceAction.bind(null, invoice.id)}
                        unpostAndDelete={deletePostedServiceInvoiceFromListAction.bind(null, invoice.id)}
                        movesStock={false}
                      />
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
