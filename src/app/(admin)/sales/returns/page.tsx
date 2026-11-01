import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Undo2 } from "lucide-react";
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
import { SALES_MANAGE_PERMISSION, customerLabel, salesLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "Sales Returns" };

const basePath = "/sales/returns";
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
        description="Goods customers bring back from a completed sale. Posting puts resellable goods back into stock and refunds the money or deducts it from the customer's dues."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Sales Returns" }]}
        actions={
          <Suspense>
            <PermissionOnly code={SALES_MANAGE_PERMISSION}>
              <LinkButton href={`${basePath}/new`}>
                <Plus className="size-4" aria-hidden /> New return
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <ReturnList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ReturnList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const status = firstParam(query.status);
  const customerParam = firstParam(query.customer);
  const customerId = customerParam ? (parseIdParam(customerParam) ?? undefined) : undefined;
  const from = firstParam(query.from);
  const to = firstParam(query.to);
  const offset = parseOffset(query.offset);

  const [customers, result] = await Promise.all([
    getCustomerOptions(),
    tryApi(() => salesApi.returns.list({ search, status, customerId, from, to, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search || status || customerId || from || to);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} return(s)` : "Returns"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Return no, invoice no, customer, mobile" filtered={filtered}>
            <FilterSelect
              name="customer"
              label="Customer"
              value={customerId ? String(customerId) : undefined}
              options={(customers.ok ? customers.data : []).map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All customers"
              className="w-44"
            />
            <FilterSelect name="status" label="Status" value={status} options={STATUS_OPTIONS} allLabel="All statuses" className="w-32" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
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
                <TH>Return</TH>
                <TH>Date</TH>
                <TH>Sale</TH>
                <TH>Customer</TH>
                <TH>Settlement</TH>
                <TH className="text-right">Total</TH>
                <TH>Status</TH>
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
                </TR>
              ))}
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
