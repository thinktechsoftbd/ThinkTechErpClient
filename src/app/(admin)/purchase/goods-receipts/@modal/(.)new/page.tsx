import { Suspense } from "react";
import { TableSkeleton } from "@/core/ui/feedback";
import { RouteModal } from "@/core/ui/route-modal";
import { NewGoodsReceiptScreen } from "@/modules/purchase/components/new-document-screens";

/** New goods receipt in a popup over the list; saving returns to the list. */
export default function NewGoodsReceiptsModal({ searchParams }: PageProps<"/purchase/goods-receipts/new">) {
  return (
    <RouteModal title="New goods receipt" description="Goods that came in before the bill. Posting brings the stock in; the dues are recorded when you bill it.">
      <Suspense fallback={<TableSkeleton rows={6} columns={5} />}>
        <NewGoodsReceiptScreen searchParams={searchParams} returnTo="/purchase/goods-receipts" />
      </Suspense>
    </RouteModal>
  );
}
