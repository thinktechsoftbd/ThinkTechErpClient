import type { Metadata } from "next";
import { BillListScreen } from "@/modules/accounting/components/bill-screens";

export const metadata: Metadata = { title: "Customer Bill Collection" };

export default function BillCollectionsPage({ searchParams }: PageProps<"/accounting/bill-collections">) {
  return <BillListScreen kind="collection" searchParams={searchParams} />;
}
