import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewAdjustment, inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "New Stock Adjustment" };

export default function NewStockAdjustmentPage() {
  return (
    <>
      <PageHeader
        title="New stock adjustment"
        description="Remove stock that is damaged, expired or lost, or add stock that was found."
        breadcrumbs={inventoryCrumbs({ label: "Stock Adjustments", href: "/inventory/adjustments" }, { label: "New" })}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewAdjustment kind="adjustment" />
      </Suspense>
    </>
  );
}
