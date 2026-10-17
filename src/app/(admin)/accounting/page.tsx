import type { Metadata } from "next";
import { PlannedModule } from "@/core/layout/planned-module";
import { accountingModule } from "@/modules/accounting/module";

export const metadata: Metadata = { title: "Accounting" };

export default function AccountingPage() {
  return <PlannedModule module={accountingModule} />;
}
