import { Calculator } from "lucide-react";
import { defineModule } from "@/core/modules/types";

export const accountingModule = defineModule({
  key: "accounting",
  name: "Accounting",
  description: "Chart of accounts, journals, ledgers and financial reports.",
  icon: Calculator,
  basePath: "/accounting",
  status: "planned",
  roles: ["accounting_admin"],
  nav: [{ label: "Overview", href: "/accounting", exact: true }],
  permissions: [
    { key: "accounting.journals.view", label: "View journals and ledgers" },
    { key: "accounting.journals.post", label: "Post journal entries" },
  ],
});
