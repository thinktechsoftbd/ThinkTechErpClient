import { MessageSquareText } from "lucide-react";
import { defineModule } from "@/core/modules/types";

export const smsModule = defineModule({
  key: "sms",
  name: "SMS",
  description: "Platform SMS balance, client accounts, purchases and allocations.",
  icon: MessageSquareText,
  basePath: "/sms",
  status: "active",
  // Matches the API's SmsAdmin policy (RequireRole("sms_admin")).
  roles: ["sms_admin"],
  nav: [
    { label: "Overview", href: "/sms", exact: true },
    { label: "Clients", href: "/sms/clients" },
    { label: "Purchases", href: "/sms/purchases" },
    { label: "Allocations", href: "/sms/allocations" },
    { label: "Transactions", href: "/sms/transactions" },
  ],
  permissions: [
    { key: "sms.balance.view", label: "View platform balance" },
    { key: "sms.clients.view", label: "View SMS clients" },
    { key: "sms.clients.manage", label: "Create and edit SMS clients" },
    { key: "sms.purchases.manage", label: "Record ADN purchases" },
    { key: "sms.allocations.manage", label: "Allocate SMS to clients" },
    { key: "sms.transactions.view", label: "View balance transactions" },
  ],
});
