import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewReturnScreen } from "@/modules/sales/components/new-return-screen";

export const metadata: Metadata = { title: "New Sales Return" };

type Props = PageProps<"/sales/returns/new">;

/** The New return page (opened directly or reloaded); from the list it opens in a popup (@modal/(.)new). */
export default function NewSalesReturnPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New sales return"
        description="Goods a customer brings back from a completed sale. Posting puts resellable goods back into stock and refunds the money or deducts it from the customer's dues."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Sales", href: "/sales" },
          { label: "Sales Returns", href: "/sales/returns" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewReturnScreen searchParams={searchParams} />
      </Suspense>
    </>
  );
}
