import { canAccessModule, type AccessSubject } from "@/core/auth/roles";
import type { ModuleDefinition } from "@/core/modules/types";
import { accountingModule } from "./accounting/module";
import { inventoryModule } from "./inventory/module";
import { purchaseModule } from "./purchase/module";
import { securityModule } from "./security/module";
import { smsModule } from "./sms/module";
import { websiteModule } from "./website/module";

/** Every module known to the shell, in sidebar order. Register new modules here. */
export const modules: readonly ModuleDefinition[] = [
  securityModule,
  smsModule,
  websiteModule,
  inventoryModule,
  purchaseModule,
  accountingModule,
];

export function getModule(key: string) {
  return modules.find((module) => module.key === key);
}

export function getAccessibleModules(user: AccessSubject) {
  return modules.filter((module) => canAccessModule(user, module));
}
