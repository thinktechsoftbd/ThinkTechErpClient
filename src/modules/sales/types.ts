// Contract of ThinkTechErpAPI's Sales area (Areas/Sales). JSON is camelCase; dates are "YYYY-MM-DD"
// (C# DateOnly). Every call works in the organization chosen in the header.

import type { ProductType, TrackingType } from "@/modules/inventory/types";

export const SALES_VIEW_PERMISSION = "SALES.V";
export const SALES_MANAGE_PERMISSION = "SALES.M";

/** Lookup list grouping customers (Settings > Lookup Data). */
export const CUSTOMER_GROUP_LOOKUP_TABLE = "Customer Group";

export const RECEIPT_METHODS = ["Cash", "Bank", "Cheque", "MobileWallet", "Card", "Other"] as const;
/** Taken at the counter with a sale: no cheque (it can bounce; record it as a customer receipt). */
export const COUNTER_METHODS = ["Cash", "MobileWallet", "Card", "Bank", "Other"] as const;

export type SaleType = "Cash" | "Credit";

// ---- Customers

export type Customer = {
  id: number;
  objectId: string;
  code: string;
  name: string;
  nameLocal: string | null;
  customerGroupLookupDataId: number | null;
  customerGroup: string | null;
  contactPerson: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  nationalIdNo: string | null;
  taxRegistrationNo: string | null;
  paymentTermsDays: number;
  /** The most the customer may owe at once (base currency). Null = no limit, 0 = cash only. */
  creditLimit: number | null;
  openingBalance: number;
  openingBalanceDate: string | null;
  remarks: string | null;
  isActive: boolean;
  /** Owed by the customer now (+) or paid in advance (-), base currency. */
  balance: number;
  createdAt: string;
  updatedAt: string | null;
};

export type CustomerUpsertRequest = {
  /** Empty: the next code in the series (C-00001, ...). */
  code: string | null;
  name: string;
  nameLocal: string | null;
  customerGroupLookupDataId: number | null;
  contactPerson: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  nationalIdNo: string | null;
  taxRegistrationNo: string | null;
  paymentTermsDays: number;
  creditLimit: number | null;
  openingBalance: number;
  openingBalanceDate: string | null;
  remarks: string | null;
  isActive: boolean;
};

/** A customer as the sales screen picks it, with what they owe and the credit left. */
export type CustomerOption = {
  id: number;
  code: string;
  name: string;
  mobile: string | null;
  address: string | null;
  paymentTermsDays: number;
  creditLimit: number | null;
  balance: number;
  /** Credit limit minus balance; null when there is no limit. */
  availableCredit: number | null;
  isActive: boolean;
};

// ---- Sales invoice

export type LineTaxItem = { taxRateId: number; taxCode: string; taxableAmount: number; taxAmount: number; isRecoverable: boolean };

export type SalesLineRequest = {
  productId: number;
  unitId: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  /** A fixed discount for the line; when given it wins over discountPercent. */
  discountAmount: number | null;
  taxGroupId: number | null;
  description: string | null;
  /** Batch-tracked products: the lot sold from. Null: the first to expire with enough stock. */
  batchId: number | null;
  /** Serial-tracked products: one per item, in stock in the warehouse. */
  serialNos: string[];
  remarks: string | null;
};

export type SalesLine = {
  id: number;
  lineNo: number;
  productId: number;
  productCode: string;
  productName: string;
  productType: ProductType;
  trackingType: TrackingType;
  hasExpiry: boolean;
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
  /** Average cost per base unit when posted (base currency): the cost of goods sold. */
  unitCost: number;
  /** Brought back on posted sales returns, in unitId. */
  returnedQuantity: number;
  serialNos: string[];
  remarks: string | null;
  taxes: LineTaxItem[];
};

export type SalesAllocationItem = {
  id: number;
  allocationDate: string;
  amount: number;
  /** Receipt or Return. */
  sourceType: string;
  sourceId: number;
  sourceNo: string;
};

export type SalesInvoice = {
  id: number;
  objectId: string;
  invoiceNo: string;
  invoiceDate: string;
  saleType: SaleType;
  dueDate: string | null;
  customerId: number | null;
  customerCode: string | null;
  /** The customer's name, or the walk-in name on a cash sale. */
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
  /** A discount on the whole bill, taken off the total after tax ("less"). */
  extraDiscountAmount: number;
  taxAmount: number;
  /** Delivery, labour and the like. */
  chargeAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReferenceNo: string | null;
  settledAmount: number;
  dueAmount: number;
  /** Cost of the goods sold (base currency), known once posted. */
  costAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  paymentStatus: "Unpaid" | "PartiallyPaid" | "Paid";
  lineCount: number;
  postedAt: string | null;
  postedBy: number | null;
  remarks: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  lines: SalesLine[];
  allocations: SalesAllocationItem[];
};

export type SalesInvoiceUpsertRequest = {
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
  extraDiscountAmount: number;
  chargeAmount: number;
  roundOffAmount: number;
  /** Paid at the counter; ignored for Cash (always paid in full). */
  paidAmount: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReferenceNo: string | null;
  remarks: string | null;
  lines: SalesLineRequest[];
};

/** A posted invoice with something still due, for allocating a receipt. */
export type OpenSalesInvoice = {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  currencyLookupDataId: number;
  totalAmount: number;
  settledAmount: number;
  dueAmount: number;
};

// ---- Sales returns (always against a completed sale)

export const RETURN_REASONS = ["NotNeeded", "Damaged", "Expired", "WrongItem", "QualityIssue", "Other"] as const;
export type ReturnSettlement = "AdjustDue" | "Refund";

export type SalesReturnLineRequest = {
  /** The sale line returned: unit, price, discount, tax, batch and cost come from it. */
  salesInvoiceLineId: number;
  /** In the sale line's unit. */
  quantity: number;
  /** False for damaged goods that can't be sold again: they don't go back into stock. */
  isRestockable: boolean;
  /** Serial-tracked products: numbers sold on that line that come back. */
  serialNos: string[];
  remarks: string | null;
};

export type SalesReturnUpsertRequest = {
  returnDate: string;
  salesInvoiceId: number;
  /** Null: the warehouse the goods were sold from. */
  warehouseId: number | null;
  reason: string;
  /** AdjustDue needs a customer on file; Refund can't give back more than was paid on the sale. */
  settlementType: ReturnSettlement;
  refundMethod: string | null;
  refundProvider: string | null;
  refundReferenceNo: string | null;
  remarks: string | null;
  lines: SalesReturnLineRequest[];
};

export type SalesReturnLine = {
  id: number;
  lineNo: number;
  salesInvoiceLineId: number | null;
  productId: number;
  productCode: string;
  productName: string;
  productType: ProductType;
  trackingType: TrackingType;
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
  discountAmount: number;
  taxGroupId: number | null;
  taxGroupName: string | null;
  taxAmount: number;
  lineTotal: number;
  /** Per base unit: the sale line's cost, at which resellable goods come back. */
  unitCost: number;
  isRestockable: boolean;
  serialNos: string[];
  remarks: string | null;
};

export type SalesReturn = {
  id: number;
  objectId: string;
  returnNo: string;
  returnDate: string;
  customerId: number | null;
  customerCode: string | null;
  customerName: string | null;
  customerMobile: string | null;
  warehouseId: number;
  warehouseName: string;
  salesInvoiceId: number | null;
  salesInvoiceNo: string | null;
  reason: string;
  settlementType: ReturnSettlement;
  refundMethod: string | null;
  refundProvider: string | null;
  refundReferenceNo: string | null;
  currencyLookupDataId: number;
  currency: string;
  exchangeRate: number;
  subtotalAmount: number;
  /** Line discounts plus this return's share of the sale's bill discount. */
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  /** Of the total, how much settled the sale's due (AdjustDue); the rest is the customer's advance. */
  adjustedAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  lineCount: number;
  postedAt: string | null;
  postedBy: number | null;
  remarks: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  lines: SalesReturnLine[];
};

// ---- Customer receipts

export type ReceiptAllocationItem = {
  salesInvoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTotal: number;
  amount: number;
};

export type CustomerReceipt = {
  id: number;
  objectId: string;
  receiptNo: string;
  receiptDate: string;
  customerId: number;
  customerCode: string;
  customerName: string;
  customerMobile: string | null;
  /** Receipt (money in) or Refund (money given back, e.g. an unused advance). */
  receiptType: "Receipt" | "Refund";
  paymentMethod: string;
  paymentProvider: string | null;
  referenceNo: string | null;
  chequeDate: string | null;
  chequeStatus: "Pending" | "Cleared" | "Bounced" | null;
  currencyLookupDataId: number;
  currency: string;
  exchangeRate: number;
  amount: number;
  taxDeductedAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  postedAt: string | null;
  postedBy: number | null;
  remarks: string | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  allocations: ReceiptAllocationItem[];
};

export type CustomerReceiptCreateRequest = {
  receiptDate: string;
  customerId: number;
  receiptType: "Receipt" | "Refund";
  paymentMethod: string;
  paymentProvider: string | null;
  referenceNo: string | null;
  chequeDate: string | null;
  currencyLookupDataId: number | null;
  exchangeRate: number;
  amount: number;
  /** VAT or AIT the customer withheld for us (VDS/TDS); settles their dues like cash. */
  taxDeductedAmount: number;
  remarks: string | null;
  /** Invoices it settles; empty with autoAllocate: oldest open invoices first. */
  allocations: { salesInvoiceId: number; amount: number }[];
  autoAllocate: boolean;
};

// ---- Reports

export type CustomerLedgerEntry = {
  entryDate: string | null;
  /** Opening, Invoice, PaidOnInvoice, Return, ReturnRefund, Receipt or Refund. */
  entryType: string;
  documentId: number | null;
  documentNo: string | null;
  debitAmount: number;
  creditAmount: number;
  balance: number;
};

export type CustomerLedger = {
  customerId: number;
  customerCode: string;
  customerName: string;
  mobile: string | null;
  from: string;
  to: string;
  /** + = owed by the customer, - = advance; base currency. */
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: CustomerLedgerEntry[];
};

export type CustomerDueRow = {
  customerId: number;
  customerCode: string;
  customerName: string;
  mobile: string | null;
  balance: number;
  creditLimit: number | null;
  openInvoiceCount: number;
  notDue: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  over90: number;
  oldestDueDate: string | null;
};

export type SalesRegisterRow = {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  saleType: SaleType;
  customerName: string | null;
  customerMobile: string | null;
  warehouseName: string;
  currency: string;
  /** Amounts in the base currency. */
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  settledAmount: number;
  dueAmount: number;
  costAmount: number;
  /** Net sales (total less tax) minus the cost of goods sold. */
  profit: number;
  paymentStatus: string;
};

export type SalesByProductRow = {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string | null;
  baseUnitCode: string;
  /** Base units sold. */
  quantity: number;
  /** Net of discount and tax, base currency. */
  netAmount: number;
  taxAmount: number;
  costAmount: number;
  profit: number;
  marginPercent: number;
  averagePrice: number;
  invoiceCount: number;
  lastSaleDate: string | null;
};

export const SALES_LABELS: Record<string, string> = {
  MobileWallet: "Mobile wallet",
  PartiallyPaid: "Partially paid",
  PaidOnInvoice: "Paid on invoice",
  ReturnRefund: "Return refund",
  AdjustDue: "Deduct from dues",
  NotNeeded: "Not needed",
  WrongItem: "Wrong item",
  QualityIssue: "Quality issue",
};

export const salesLabel = (value: string | null | undefined) => (value ? (SALES_LABELS[value] ?? value) : "—");

/** A walk-in buyer's name for lists and memos. */
export const customerLabel = (invoice: { customerName: string | null }) => invoice.customerName ?? "Walk-in customer";
