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
import { canManageSales } from "@/modules/sales/access";
import { deleteReturnFromListAction } from "@/modules/sales/actions/returns";
import { salesApi } from "@/modules/sales/api";
import { getCustomerOptions } from "@/modules/sales/queries";
import { SALES_MANAGE_PERMISSION, customerLabel, salesLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Sales Returns" };

const basePath = "/sales/returns";
const PAGE_SIZE = 30;
const SORTS = ["number", "date", "sale", "customer", "settlement", "total", "status"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/sales/returns">;

const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

export default function SalesReturnsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Sales Returns"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sales", href: "/sales" }, { label: "Sales Returns" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SALES_MANAGE_PERMISSION}>
              {/* Opens in a popup over the list (@modal/(.)new). */}
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

// Server-side: the API filters (return no, sale no, customer name or mobile; customer, status, dates), sorts and
// pages; 30 per page, newest first unless a column is chosen.
async function ReturnList({ searchParams }: Pick<Props, "searchParams">) {
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
    tryApi(() => salesApi.returns.list({ search, status, customerId, from, to, sort, direction, limit: PAGE_SIZE, offset })),
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
          {result.ok ? `${formatNumber(result.data.totalCount)} return${result.data.totalCount === 1 ? "" : "s"}` : "Returns"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Return no, sale no, customer, mobile"
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
          icon={Undo2}
          title={filtered ? "No returns match these filters" : "No sales returns yet"}
          description={filtered ? undefined : "When a customer brings goods back, open the sale and press Return goods, or use New return."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Return", "number")}
                {header("Date", "date")}
                {header("Sale", "sale")}
                {header("Customer", "customer")}
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
                    <span className="block text-xs text-gray-500">{salesLabel(item.reason)}</span>
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(item.returnDate)}</TD>
                  <TD>
                    {item.salesInvoiceId ? (
                      <Link href={`/sales/invoices/${item.salesInvoiceId}`} className="text-brand-500 hover:underline">
                        {item.salesInvoiceNo}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    {customerLabel(item)}
                    <span className="block text-xs text-gray-500">
                      {item.customerId ? item.customerMobile : ["walk-in", item.customerMobile].filter(Boolean).join(" · ")}
                    </span>
                  </TD>
                  <TD>{item.settlementType === "Refund" ? `Refund · ${salesLabel(item.refundMethod)}` : "Deduct from dues"}</TD>
                  <TD className="text-right tabular-nums">{formatAmount(item.totalAmount)}</TD>
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
                              ? "A posted return can't be edited or deleted: its goods and refund are recorded. Open it to cancel it."
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
