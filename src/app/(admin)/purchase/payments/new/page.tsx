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
import { canManagePurchase } from "@/modules/purchase/access";
import { createPaymentAction } from "@/modules/purchase/actions/payments";
import { purchaseApi } from "@/modules/purchase/api";
import { PaymentForm } from "@/modules/purchase/components/payment-form";
import { loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";
import type { OpenPurchaseInvoice } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "New Supplier Payment" };

type Props = PageProps<"/purchase/payments/new">;

export default function NewSupplierPaymentPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New supplier payment"
        description="Pay a supplier (cash, bank, cheque, bKash/Nagad, ...) and settle their open invoices with it."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Supplier Payments", href: "/purchase/payments" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewPayment searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** ?supplierId= preselects the supplier (and loads their open invoices); ?invoiceId= settles that invoice. */
async function NewPayment({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const supplierId = parseIdParam(firstParam(query.supplierId) ?? "");
  const invoiceId = parseIdParam(firstParam(query.invoiceId) ?? "");
  const [session, options, openInvoices] = await Promise.all([
    requireSession(),
    loadPurchaseEditorOptions(),
    supplierId ? tryApi(() => purchaseApi.suppliers.openInvoices(supplierId)) : Promise.resolve(null),
  ]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  if (!canManagePurchase(session)) {
    return (
      <Alert tone="warning" title="You can't record payments">
        <p>Recording supplier payments needs the purchase manage permission.</p>
        <LinkButton href="/purchase/payments" variant="outline" size="sm" className="mt-3">
          Back to payments
        </LinkButton>
      </Alert>
    );
  }

  const known = supplierId !== null && options.data.suppliers.some((s) => s.id === supplierId);
  const invoices: OpenPurchaseInvoice[] = known && openInvoices?.ok ? openInvoices.data : [];

  return (
    <PaymentForm
      action={createPaymentAction}
      suppliers={options.data.suppliers}
      currencies={options.data.currencies}
      baseCurrencyId={options.data.baseCurrencyId}
      initial={{
        supplierId: known ? supplierId : null,
        invoices,
        invoicesError: known && openInvoices && !openInvoices.ok ? openInvoices.error.message : undefined,
        invoiceId: invoiceId && invoices.some((i) => i.id === invoiceId) ? invoiceId : null,
      }}
      cancelHref={invoiceId ? `/purchase/invoices/${invoiceId}` : "/purchase/payments"}
    />
  );
}
