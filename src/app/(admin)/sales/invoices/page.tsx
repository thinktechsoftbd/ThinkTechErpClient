import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
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
import { canManageSales } from "@/modules/sales/access";
import { deletePostedSaleFromListAction, deleteSaleFromListAction, unpostSaleAction } from "@/modules/sales/actions/invoices";
import { salesApi } from "@/modules/sales/api";
import { getCustomerOptions } from "@/modules/sales/queries";
import { SALES_MANAGE_PERMISSION, customerLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Sales" };

const basePath = "/sales/invoices";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "customer", "type", "total", "due", "payment", "status"] as const;
type Sort = (typeof SORTS)[number];
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

/** A query value only when it is one of the allowed ones (the URL may hold anything). */
function oneOf(value: string | undefined, options: { value: string }[]) {
  return value && options.some((option) => option.value === value) ? value : undefined;
}

export default function SalesInvoicesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Sales"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sales", href: "/sales" }, { label: "Invoices" }]}
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
        <Suspense fallback={<TableSkeleton columns={9} />}>
          <InvoiceList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (number, customer name, code or mobile; customer, type, payment, status, dates),
// sorts and pages; 30 per page, newest first unless a column is chosen.
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
    getCustomerOptions(),
    tryApi(() =>
      salesApi.invoices.list({ search, status, saleType, paymentStatus, customerId, from, to, sort, direction, limit: PAGE_SIZE, offset }),
    ),
  ]);
  const filtered = Boolean(search || status || saleType || paymentStatus || customerId || from || to);
  const canManage = canManageSales(session);
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
          {result.ok ? `${formatNumber(result.data.totalCount)} sale${result.data.totalCount === 1 ? "" : "s"}` : "Sales"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="No, customer, mobile"
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
          icon={ShoppingBag}
          title={filtered ? "No sales match these filters" : "No sales yet"}
          description={filtered ? undefined : "Sell at the counter with New sale."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Invoice", "number")}
                {header("Date", "date")}
                {header("Customer", "customer")}
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
                  {canManage && (
                    <TD className="text-right">
                      {/* Locked only while finalized (bill voucher posted) or cancelled; a completed sale goes back to draft first. */}
                      <InvoiceRowActions
                        invoice={invoice}
                        noun="sale"
                        editHref={`${basePath}/${invoice.id}/edit`}
                        deleteDraft={deleteSaleFromListAction.bind(null, invoice.id)}
                        unpostAndEdit={unpostSaleAction.bind(null, invoice.id)}
                        unpostAndDelete={deletePostedSaleFromListAction.bind(null, invoice.id)}
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
