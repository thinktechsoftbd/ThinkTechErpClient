import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewTransfer, inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "New Stock Transfer" };

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewStockTransferPage() {
  return (
    <>
      <PageHeader
        title="New transfer"
        description="Send stock from one warehouse to another, e.g. from the godown to the shop."
        breadcrumbs={inventoryCrumbs({ label: "Stock Transfers", href: "/inventory/transfers" }, { label: "New" })}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewTransfer />
      </Suspense>
    </>
  );
}
