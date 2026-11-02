import { NewBillModal } from "@/modules/accounting/components/bill-screens";

export default function NewBillCollectionModal({ searchParams }: PageProps<"/accounting/bill-collections/new">) {
  return <NewBillModal kind="collection" searchParams={searchParams} />;
}
