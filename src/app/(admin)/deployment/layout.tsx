import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { deploymentModule } from "@/modules/security/deployment-module";

export default function DeploymentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={deploymentModule}>{children}</ModuleGate>
    </Suspense>
  );
}
