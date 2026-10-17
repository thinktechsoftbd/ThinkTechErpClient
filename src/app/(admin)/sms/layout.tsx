import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { smsModule } from "@/modules/sms/module";

export default function SmsLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={smsModule}>{children}</ModuleGate>
    </Suspense>
  );
}
