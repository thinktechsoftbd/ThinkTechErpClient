import type { Metadata } from "next";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { getCurrencyOptions, getInventorySettings } from "@/modules/inventory/queries";
import { canManageSales } from "@/modules/sales/access";
import { createReceiptAction } from "@/modules/sales/actions/receipts";
import { salesApi } from "@/modules/sales/api";
import { ReceiptForm } from "@/modules/sales/components/receipts/receipt-form";
import type { OpenSalesInvoice } from "@/modules/sales/types";

export const metadata: Metadata = { title: "New Customer Receipt" };

type Props = PageProps<"/sales/receipts/new">;

export default function NewCustomerReceiptPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New money receipt"
        description="Collect a customer's dues (cash, bank, cheque, bKash/Nagad, card, ...) and settle their open invoices with it."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Customer Receipts", href: "/sales/receipts" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewReceipt searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** The customer of ?customerId=, or of the invoice in ?invoiceId= when only that is given. */
async function resolveCustomerId(customerId: number | null, invoiceId: number | null) {
  if (customerId || !invoiceId) return customerId;
  const invoice = await tryApi(() => salesApi.invoices.get(invoiceId));
  return invoice.ok ? invoice.data.customerId : null;
}

/** ?customerId= preselects the customer (and loads their open invoices); ?invoiceId= collects that invoice. */
async function NewReceipt({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const invoiceId = parseIdParam(firstParam(query.invoiceId) ?? "");
  const [session, currencies, settings, customerId] = await Promise.all([
    requireSession(),
    getCurrencyOptions(),
    getInventorySettings(),
    resolveCustomerId(parseIdParam(firstParam(query.customerId) ?? ""), invoiceId),
  ]);
  if (!currencies.ok) return <Card><ApiErrorState error={currencies.error} /></Card>;
  if (!settings.ok) return <Card><ApiErrorState error={settings.error} /></Card>;
  if (!canManageSales(session)) {
    return (
      <Alert tone="warning" title="You can't record receipts">
        <p>Recording customer receipts needs the sales manage permission.</p>
        <LinkButton href="/sales/receipts" variant="outline" size="sm" className="mt-3">
          Back to receipts
        </LinkButton>
      </Alert>
    );
  }

  const [customers, openInvoices] = customerId
    ? await Promise.all([
        tryApi(() => salesApi.customers.options({ ids: String(customerId), limit: 1 })),
        tryApi(() => salesApi.customers.openInvoices(customerId)),
      ])
    : [null, null];
  const customer = customers?.ok ? (customers.data.find((c) => c.id === customerId) ?? null) : null;
  const invoices: OpenSalesInvoice[] = customer && openInvoices?.ok ? openInvoices.data : [];

  return (
    <ReceiptForm
      action={createReceiptAction}
      currencies={currencies.data}
      baseCurrencyId={settings.data.baseCurrencyLookupDataId}
      initial={{
        customer,
        invoices,
        invoicesError: customer && openInvoices && !openInvoices.ok ? openInvoices.error.message : undefined,
        invoiceId: invoiceId && invoices.some((i) => i.id === invoiceId) ? invoiceId : null,
      }}
      cancelHref={invoiceId ? `/sales/invoices/${invoiceId}` : "/sales/receipts"}
    />
  );
}
