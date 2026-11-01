import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { salesModule } from "@/modules/sales/module";

export default function SalesLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={salesModule}>{children}</ModuleGate>
    </Suspense>
  );
}
