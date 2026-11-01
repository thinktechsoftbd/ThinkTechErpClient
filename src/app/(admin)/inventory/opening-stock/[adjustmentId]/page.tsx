import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { AdjustmentDetail } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "Opening Stock" };

export default function OpeningStockDetailPage({ params }: PageProps<"/inventory/opening-stock/[adjustmentId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdjustmentDetail kind="opening" params={params} />
    </Suspense>
  );
}
