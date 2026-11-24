import type { AccessSubject } from "@/core/auth/roles";
import { SERVICE_INVOICE_MANAGE_PERMISSION } from "./service-invoice-types";
import { WARRANTY_MANAGE_PERMISSION } from "./types";

/** The API's WarrantyManage policy: changes need WARRANTY.M; WARRANTY.V alone is read-only. */
export function canManageWarranty(user: AccessSubject) {
  return user.permissions.includes(WARRANTY_MANAGE_PERMISSION);
}

/** The API's ServiceInvoiceManage policy: changes need SERVICE_INVOICE.M; SERVICE_INVOICE.V alone is read-only. */
export function canManageServiceInvoices(user: AccessSubject) {
  return user.permissions.includes(SERVICE_INVOICE_MANAGE_PERMISSION);
}
