import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { getCurrencyOptions, getInventorySettings } from "@/modules/inventory/queries";
import { canManageSales } from "../../access";
import { createReceiptAction } from "../../actions/receipts";
import { salesApi } from "../../api";
import type { OpenSalesInvoice } from "../../types";
import { ReceiptForm } from "./receipt-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The customer of ?customerId=, or of the invoice in ?invoiceId= when only that is given. */
async function resolveCustomerId(customerId: number | null, invoiceId: number | null) {
  if (customerId || !invoiceId) return customerId;
  const invoice = await tryApi(() => salesApi.invoices.get(invoiceId));
  return invoice.ok ? invoice.data.customerId : null;
}

/**
 * A new money receipt, on its page or (with `returnTo`, the list) in the popup over the receipts list.
 * ?customerId= preselects the customer (and loads their open invoices); ?invoiceId= collects that invoice.
 */
export async function NewReceiptScreen({ searchParams, returnTo }: { searchParams: SearchParams; returnTo?: string }) {
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
      returnTo={returnTo}
    />
  );
}
