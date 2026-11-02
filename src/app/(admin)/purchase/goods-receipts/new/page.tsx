import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewGoodsReceiptScreen } from "@/modules/purchase/components/new-document-screens";

export const metadata: Metadata = { title: "New Goods Receipt" };

type Props = PageProps<"/purchase/goods-receipts/new">;

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewGoodsReceiptPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New goods receipt"
        description="Goods that came in before the bill. Posting brings the stock in; the dues are recorded when you bill it."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Goods Receipts", href: "/purchase/goods-receipts" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewGoodsReceiptScreen searchParams={searchParams} />
      </Suspense>
    </>
  );
}
