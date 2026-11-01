import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { EditAdjustment } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "Edit Opening Stock" };

export default function EditOpeningStockPage({ params, searchParams }: PageProps<"/inventory/opening-stock/[adjustmentId]/edit">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditAdjustment kind="opening" params={params} searchParams={searchParams} />
    </Suspense>
  );
}
