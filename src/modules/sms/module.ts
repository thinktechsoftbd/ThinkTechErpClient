import { MessageSquareText } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { SMS_MANAGE_PERMISSION, SMS_VIEW_PERMISSION } from "./types";

export const smsModule = defineModule({
  key: "sms",
  name: "SMS",
  description: "SMS bought from providers, allocated to organizations, and what each organization used and has left.",
  icon: MessageSquareText,
  basePath: "/sms",
  status: "active",
  // The API's SmsView / SmsManage policies check these permission codes.
  accessPermissions: [SMS_VIEW_PERMISSION, SMS_MANAGE_PERMISSION],
  nav: [
    { label: "Overview", href: "/sms", exact: true },
    { label: "Providers", href: "/sms/providers" },
    { label: "Purchases", href: "/sms/purchases" },
    { label: "Allocations", href: "/sms/allocations" },
    { label: "Organizations", href: "/sms/organizations" },
  ],
  permissions: [
    { key: SMS_VIEW_PERMISSION, label: "View SMS providers, purchases, allocations and organization balances" },
    { key: SMS_MANAGE_PERMISSION, label: "Manage providers, purchases and allocations; record organization usage" },
  ],
});
