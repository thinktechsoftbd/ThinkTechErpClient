import { Receipt } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { SERVICE_INVOICE_MANAGE_PERMISSION, SERVICE_INVOICE_VIEW_PERMISSION } from "./service-invoice-types";

/**
 * The /warranty/service-invoices screens (Warranty -> Transactions -> Service Invoice in the menu table). Not in the
 * module registry: it gates those pages and their actions for users with the API's ServiceInvoiceView policy.
 */
export const serviceInvoiceModule = defineModule({
  key: "service-invoices",
  name: "Service Invoice",
  description: "Bills for service work: the parts used, the service charge and a note of the work, cash or credit.",
  icon: Receipt,
  basePath: "/warranty/service-invoices",
  status: "active",
  accessPermissions: [SERVICE_INVOICE_VIEW_PERMISSION, SERVICE_INVOICE_MANAGE_PERMISSION],
  nav: [],
  permissions: [
    { key: SERVICE_INVOICE_VIEW_PERMISSION, label: "View service invoices" },
    { key: SERVICE_INVOICE_MANAGE_PERMISSION, label: "Create, edit and delete service invoices" },
  ],
});
