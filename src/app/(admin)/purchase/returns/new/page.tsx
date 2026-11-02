import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewPurchaseReturnScreen } from "@/modules/purchase/components/new-document-screens";

export const metadata: Metadata = { title: "New Purchase Return" };

type Props = PageProps<"/purchase/returns/new">;

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewPurchaseReturnPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New purchase return"
        description="Goods going back to the supplier. Posting takes the stock out and deducts from the dues, or records the refund."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Returns", href: "/purchase/returns" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewPurchaseReturnScreen searchParams={searchParams} />
      </Suspense>
    </>
  );
}
