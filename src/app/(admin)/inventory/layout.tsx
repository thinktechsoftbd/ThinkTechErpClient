import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { inventoryModule } from "@/modules/inventory/module";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={inventoryModule}>{children}</ModuleGate>
    </Suspense>
  );
}
