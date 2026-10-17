import type { Metadata } from "next";
import { PlannedModule } from "@/core/layout/planned-module";
import { inventoryModule } from "@/modules/inventory/module";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return <PlannedModule module={inventoryModule} />;
}
