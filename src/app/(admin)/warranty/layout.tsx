import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { warrantyModule } from "@/modules/warranty/module";

export default function WarrantyLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={warrantyModule}>{children}</ModuleGate>
    </Suspense>
  );
}
