import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { securityModule } from "@/modules/security/module";

export default function SecurityLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={securityModule}>{children}</ModuleGate>
    </Suspense>
  );
}
