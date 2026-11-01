import type { Metadata } from "next";
import { NewBillScreen } from "@/modules/accounting/components/bill-screens";

export const metadata: Metadata = { title: "New Bill Payment" };

export default function NewBillPaymentPage({ searchParams }: PageProps<"/accounting/bill-payments/new">) {
  return <NewBillScreen kind="payment" searchParams={searchParams} />;
}
