// Contract of the API's ServiceInvoice area (/api/service-invoices): a bill for service work with the parts used
// (lines), the service charge and a note of the work, cash or credit. Saved as drafts: no stock moves and no due goes
// to the customer's ledger. JSON is camelCase, dates "YYYY-MM-DD", timestamps ISO in UTC.

import type { SaleType } from "@/modules/sales/types";

export const SERVICE_INVOICE_VIEW_PERMISSION = "SERVICE_INVOICE.V";
export const SERVICE_INVOICE_MANAGE_PERMISSION = "SERVICE_INVOICE.M";

export type ServiceInvoiceLine = {
  id: number;
  lineNo: number;
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  trackingType: string;
  description: string | null;
  unitId: number;
  unitCode: string;
  baseUnitCode: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  batchId: number | null;
  batchNo: string | null;
  expiryDate: string | null;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxGroupId: number | null;
  taxGroupName: string | null;
  taxAmount: number;
  lineTotal: number;
  remarks: string | null;
};

export type ServiceInvoice = {
  id: number;
  objectId: string;
  invoiceNo: string;
  invoiceDate: string;
  saleType: SaleType;
  dueDate: string | null;
  customerId: number | null;
  customerCode: string | null;
  /** The customer's name, or the walk-in name on a cash bill. */
  customerName: string | null;
  customerMobile: string | null;
  customerAddress: string | null;
  warehouseId: number;
  warehouseName: string;
  currencyLookupDataId: number;
  currency: string;
  exchangeRate: number;
  subtotalAmount: number;
  /** Line discounts plus the discount on the whole bill. */
  discountAmount: number;
  extraDiscountAmount: number;
  taxAmount: number;
  /** Other charges (delivery, pick-up and the like). */
  chargeAmount: number;
  /** The service / labour charge, part of the total. */
  serviceAmount: number;
  roundOffAmount: number;
  /** Lines + charge + service amount - bill discount + round off. */
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReferenceNo: string | null;
  settledAmount: number;
  dueAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  paymentStatus: "Unpaid" | "PartiallyPaid" | "Paid";
  lineCount: number;
  postedAt: string | null;
  postedBy: number | null;
  /** What was serviced or repaired. */
  serviceNote: string | null;
  remarks: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  lines: ServiceInvoiceLine[];
};

export type ServiceInvoiceLineRequest = {
  productId: number;
  unitId: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number | null;
  taxGroupId: number | null;
  description: string | null;
  batchId: number | null;
  remarks: string | null;
};

export type ServiceInvoiceUpsertRequest = {
  invoiceDate: string;
  saleType: SaleType;
  dueDate: string | null;
  /** Required for Credit; optional for Cash (a walk-in customer is named below). */
  customerId: number | null;
  customerName: string | null;
  customerMobile: string | null;
  warehouseId: number | null;
  currencyLookupDataId: number | null;
  exchangeRate: number;
  serviceAmount: number;
  extraDiscountAmount: number;
  chargeAmount: number;
  roundOffAmount: number;
  /** Paid now; ignored for Cash, which is paid in full. */
  paidAmount: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReferenceNo: string | null;
  serviceNote: string | null;
  remarks: string | null;
  /** The parts used; may be empty when the bill is for the service charge alone. */
  lines: ServiceInvoiceLineRequest[];
};

export type ServiceInvoiceListQuery = {
  search?: string;
  status?: string;
  customerId?: number;
  from?: string;
  to?: string;
  saleType?: string;
  paymentStatus?: string;
  /** number, date, customer, type, service, total, due, payment or status; the API's default is newest first. */
  sort?: string;
  direction?: "asc" | "desc";
  limit: number;
  offset: number;
};
