import type { Metadata } from "next";
import { PlannedModule } from "@/core/layout/planned-module";
import { purchaseModule } from "@/modules/purchase/module";

export const metadata: Metadata = { title: "Purchase" };

export default function PurchasePage() {
  return <PlannedModule module={purchaseModule} />;
}
