import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { EditAdjustment } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "Edit Stock Adjustment" };

export default function EditStockAdjustmentPage({ params, searchParams }: PageProps<"/inventory/adjustments/[adjustmentId]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditAdjustment kind="adjustment" params={params} searchParams={searchParams} />
    </Suspense>
  );
}
