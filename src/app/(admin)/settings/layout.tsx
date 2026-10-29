import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { settingsModule } from "@/modules/settings/module";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={settingsModule}>{children}</ModuleGate>
    </Suspense>
  );
}
