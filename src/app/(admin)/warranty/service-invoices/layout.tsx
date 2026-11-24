import { Suspense } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { serviceInvoiceModule } from "@/modules/warranty/service-invoice-module";

/**
 * Service invoices with the @modal slot: from the list, New opens in a popup over it (@modal/(.)new). Gated by
 * SERVICE_INVOICE.V/M (the Warranty layout above lets those users in too).
 */
export default function ServiceInvoicesLayout({ children, modal }: LayoutProps<"/warranty/service-invoices">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={serviceInvoiceModule}>
        {children}
        {modal}
      </ModuleGate>
    </Suspense>
  );
}
