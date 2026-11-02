import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { NewReceiptScreen } from "@/modules/sales/components/receipts/new-receipt-screen";

export const metadata: Metadata = { title: "New Customer Receipt" };

type Props = PageProps<"/sales/receipts/new">;

/** The full page, for a refresh or a link (e.g. from an invoice); from the list it opens in a popup. */
export default function NewCustomerReceiptPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="New money receipt"
        description="Collect a customer's dues (cash, bank, cheque, bKash/Nagad, card, ...) and settle their open invoices with it."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Customer Receipts", href: "/sales/receipts" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewReceiptScreen searchParams={searchParams} />
      </Suspense>
    </>
  );
}
