import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewPurchaseInvoiceScreen } from "@/modules/purchase/components/new-document-screens";

export const metadata: Metadata = { title: "New Purchase" };

type Props = PageProps<"/purchase/invoices/new">;

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewPurchaseInvoicePage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New purchase"
        description="Enter the supplier's bill: cash or credit. Posting brings the stock in."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Invoices", href: "/purchase/invoices" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewPurchaseInvoiceScreen searchParams={searchParams} />
      </Suspense>
    </>
  );
}
