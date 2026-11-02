import { NewBillModal } from "@/modules/accounting/components/bill-screens";

export default function NewBillPaymentModal({ searchParams }: PageProps<"/accounting/bill-payments/new">) {
  return <NewBillModal kind="payment" searchParams={searchParams} />;
}
