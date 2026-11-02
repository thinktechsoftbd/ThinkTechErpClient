import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewSupplierPaymentScreen } from "@/modules/purchase/components/new-document-screens";

export const metadata: Metadata = { title: "New Supplier Payment" };

type Props = PageProps<"/purchase/payments/new">;

/** The full page, for a refresh or a link; from the list it opens in a popup (@modal/(.)new). */
export default function NewSupplierPaymentPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New supplier payment"
        description="Pay a supplier (cash, bank, cheque, bKash/Nagad, ...) and settle their open invoices with it."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Supplier Payments", href: "/purchase/payments" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewSupplierPaymentScreen searchParams={searchParams} />
      </Suspense>
    </>
  );
}
