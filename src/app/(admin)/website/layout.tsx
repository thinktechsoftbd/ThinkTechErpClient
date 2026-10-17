import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { websiteModule } from "@/modules/website/module";

export default function WebsiteLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={websiteModule}>{children}</ModuleGate>
    </Suspense>
  );
}
