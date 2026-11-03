import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Search, SearchX } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Input } from "@/core/forms/fields";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Button, LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { EmptyState, PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageSales } from "@/modules/sales/access";
import { saveReturnAction } from "@/modules/sales/actions/returns";
import { salesApi } from "@/modules/sales/api";
import { ReturnEditor } from "@/modules/sales/components/return-editor";
import { loadReturnEditorData } from "@/modules/sales/return-data";
import { customerLabel } from "@/modules/sales/types";

export const metadata: Metadata = { title: "New Sales Return" };

const basePath = "/sales/returns/new";
type Props = PageProps<"/sales/returns/new">;

export default function NewSalesReturnPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New sales return"
        description="Goods a customer brings back from a completed sale. Posting puts resellable goods back into stock and refunds the money or deducts it from the customer's dues."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Sales Returns", href: "/sales/returns" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewReturn searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** ?invoiceId= returns goods from that completed sale; without it, find the sale first (?q=). */
async function NewReturn({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const invoiceId = parseIdParam(firstParam(query.invoiceId) ?? "");
  const session = await requireSession();
  if (!canManageSales(session)) {
    return (
      <Alert tone="warning" title="You can't record sales returns">
        <p>Recording returns needs the sales manage permission.</p>
        <LinkButton href="/sales/returns" variant="outline" size="sm" className="mt-3">
          Back to returns
        </LinkButton>
      </Alert>
    );
  }
  if (!invoiceId) return <FindSale search={firstParam(query.q)} />;

  const result = await tryApi(() => salesApi.invoices.get(invoiceId));
  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} notFoundHint="This sale doesn't exist. Find it again by its memo number." />
      </Card>
    );
  }
  const sale = result.data;
  const saleHref = `/sales/invoices/${sale.id}`;
  if (sale.status !== "Posted") {
    return (
      <Alert tone="error" title={`Goods can't be returned against ${sale.invoiceNo}`}>
        <p>
          {sale.status === "Draft"
            ? "The sale isn't completed yet: nothing went out of stock. Edit or delete the draft instead."
            : "The sale was cancelled: its goods are already back in stock."}
        </p>
        <LinkButton href={saleHref} variant="outline" size="sm" className="mt-3">
          Back to the sale
        </LinkButton>
      </Alert>
    );
  }
  if (sale.lines.every((line) => line.quantity - line.returnedQuantity <= 0)) {
    return (
      <Alert tone="info" title={`Everything sold on ${sale.invoiceNo} has been returned`}>
        <LinkButton href={saleHref} variant="outline" size="sm" className="mt-3">
          Back to the sale
        </LinkButton>
      </Alert>
    );
  }

  const data = await loadReturnEditorData(sale);
  if (!data.ok) return <Card><ApiErrorState error={data.error} /></Card>;
  return (
    <ReturnEditor
      sale={sale}
      warehouses={data.data.warehouses}
      history={data.data.history}
      canPost={canManageSales(session)}
      action={saveReturnAction.bind(null, null)}
      cancelHref={saleHref}
    />
  );
}

/** Completed sales matching the memo / invoice number, customer name or mobile. */
async function FindSale({ search }: { search: string | undefined }) {
  const result = search ? await tryApi(() => salesApi.invoices.list({ search, status: "Posted", limit: 20, offset: 0 })) : null;

  return (
    <Card>
      <CardHeader
        title="Find the sale"
        description="A return is always against a completed sale. Search by the memo (invoice) number on the customer's receipt, or their mobile."
      />
      <CardBody>
        <Form action={basePath} className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input name="q" defaultValue={search} placeholder="Memo no or customer mobile" aria-label="Memo no or customer mobile" className="pl-9" />
          </div>
          <Button type="submit" size="sm">
            Find sale
          </Button>
        </Form>
        {!result && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">You can also open the sale and press Return goods.</p>
        )}
      </CardBody>
      {result &&
        (!result.ok ? (
          <ApiErrorState error={result.error} />
        ) : result.data.items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={`No completed sale matches “${search}”`}
            description="Check the number on the memo, or search by the customer's mobile or name."
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Sale</TH>
                <TH>Date</TH>
                <TH>Customer</TH>
                <TH className="text-right">Total</TH>
                <TH className="text-right">Due</TH>
                <TH>
                  <span className="sr-only">Return</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((invoice) => (
                <TR key={invoice.id}>
                  <TD>
                    <Link href={`/sales/invoices/${invoice.id}`} className="font-medium text-brand-500 hover:underline">
                      {invoice.invoiceNo}
                    </Link>
                    <span className="block text-xs text-gray-500">
                      {invoice.saleType} · {invoice.warehouseName}
                    </span>
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(invoice.invoiceDate)}</TD>
                  <TD>
                    {customerLabel(invoice)}
                    <span className="block text-xs text-gray-500">
                      {invoice.customerId ? invoice.customerMobile : ["walk-in", invoice.customerMobile].filter(Boolean).join(" · ")}
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">{formatAmount(invoice.totalAmount)}</TD>
                  <TD className="text-right tabular-nums">{invoice.dueAmount > 0 ? formatAmount(invoice.dueAmount) : "—"}</TD>
                  <TD className="text-right">
                    <LinkButton href={`${basePath}?invoiceId=${invoice.id}`} size="sm" variant="outline">
                      Return goods
                    </LinkButton>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        ))}
    </Card>
  );
}
