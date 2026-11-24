import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewServiceInvoiceScreen } from "@/modules/warranty/components/new-service-invoice-screen";

export const metadata: Metadata = { title: "New Service Invoice" };

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewServiceInvoicePage() {
  return (
    <>
      <PageHeader
        title="New service invoice"
        description="Note the work, enter the service amount and any parts used, and choose cash or credit."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Warranty", href: "/warranty" },
          { label: "Service Invoices", href: "/warranty/service-invoices" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewServiceInvoiceScreen />
      </Suspense>
    </>
  );
}
