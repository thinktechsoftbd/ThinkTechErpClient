import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { purchaseModule } from "@/modules/purchase/module";

export default function PurchaseLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={purchaseModule}>{children}</ModuleGate>
    </Suspense>
  );
}
