import { Suspense, type ReactNode } from "react";
import { ModuleGate } from "@/core/layout/session-parts";
import { PageSkeleton } from "@/core/ui/feedback";
import { accountingModule } from "@/modules/accounting/module";

export default function AccountingLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ModuleGate module={accountingModule}>{children}</ModuleGate>
    </Suspense>
  );
}
