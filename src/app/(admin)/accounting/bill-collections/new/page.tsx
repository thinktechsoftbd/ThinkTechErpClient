import type { Metadata } from "next";
import { NewBillScreen } from "@/modules/accounting/components/bill-screens";

export const metadata: Metadata = { title: "New Bill Collection" };

export default function NewBillCollectionPage({ searchParams }: PageProps<"/accounting/bill-collections/new">) {
  return <NewBillScreen kind="collection" searchParams={searchParams} />;
}
