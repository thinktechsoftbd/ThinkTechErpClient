import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { AdjustmentDetail } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "Stock Adjustment" };

export default function StockAdjustmentDetailPage({ params }: PageProps<"/inventory/adjustments/[adjustmentId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdjustmentDetail kind="adjustment" params={params} />
    </Suspense>
  );
}
