import type { Metadata } from "next";
import { BillListScreen } from "@/modules/accounting/components/bill-screens";

export const metadata: Metadata = { title: "Supplier Bill Payment" };

export default function BillPaymentsPage({ searchParams }: PageProps<"/accounting/bill-payments">) {
  return <BillListScreen kind="payment" searchParams={searchParams} />;
}
