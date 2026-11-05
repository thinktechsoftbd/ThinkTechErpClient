// Contract of ThinkTechErpAPI's Purchase area (Areas/Purchase). JSON is camelCase; dates are
// "YYYY-MM-DD" (C# DateOnly). Every call works in the organization chosen in the header.

import type { TaxGroupRateItem, TrackingType, ProductType } from "@/modules/inventory/types";

export const PURCHASE_VIEW_PERMISSION = "PURCHASE.V";
export const PURCHASE_MANAGE_PERMISSION = "PURCHASE.M";

/** Lookup list grouping suppliers (Settings > Lookup Data). */
export const SUPPLIER_GROUP_LOOKUP_TABLE = "Supplier Group";

export const TAX_TYPES = ["VAT", "GST", "SalesTax", "SD", "Excise", "Customs", "Other"] as const;
export const PAYMENT_METHODS = ["Cash", "Bank", "Cheque", "MobileWallet", "Card", "Other"] as const;
/** Paid on the spot with a document: no cheque (it can bounce; record it as a supplier payment). */
export const ON_THE_SPOT_METHODS = ["Cash", "Bank", "MobileWallet", "Card", "Other"] as const;
export const RETURN_REASONS = ["Damaged", "Expired", "WrongItem", "Excess", "QualityIssue", "Other"] as const;

export type PurchaseType = "Cash" | "Credit";
export type PaymentStatus = "Unpaid" | "PartiallyPaid" | "Paid";

export type Supplier = {
  id: number;
  objectId: string;
  code: string;
  name: string;
  nameLocal: string | null;
  supplierGroupLookupDataId: number | null;
  supplierGroup: string | null;
  contactPerson: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  countryCode: string | null;
  taxRegistrationNo: string | null;
  taxIdNo: string | null;
  tradeLicenseNo: string | null;
  regulatoryLicenseNo: string | null;
  currencyLookupDataId: number | null;
  currency: string | null;
  paymentTermsDays: number;
  creditLimit: number | null;
  openingBalance: number;
  openingBalanceDate: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountName: string | null;
  bankAccountNo: string | null;
  bankRoutingCode: string | null;
  mobileWalletNo: string | null;
  remarks: string | null;
  isActive: boolean;
  /** Also a customer: the same party is listed on the sales screens. */
  isCustomer: boolean;
  /** Owed to the supplier now (+) or advanced (-), base currency. */
  balance: number;
  /** The mapped ledger head (an acc_sub_class id), if any, with its code, name and class path. */
  accSubClassId: number | null;
  ledgerHeadCode: string | null;
  ledgerHeadName: string | null;
  ledgerHeadPath: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type SupplierUpsertRequest = Omit<
  Supplier,
  | "id"
  | "objectId"
  | "code"
  | "supplierGroup"
  | "currency"
  | "balance"
  | "ledgerHeadCode"
  | "ledgerHeadName"
  | "ledgerHeadPath"
  | "createdAt"
  | "updatedAt"
> & {
  /** Empty: the next code in the series on create, the current one on update. */
  code: string | null;
};

export type SupplierOption = {
  id: number;
  code: string;
  name: string;
  mobile: string | null;
  /** Address line 1, or the city when it is empty. */
  address: string | null;
  paymentTermsDays: number;
  currencyLookupDataId: number | null;
  balance: number;
  isActive: boolean;
};

export type TaxRate = {
  id: number;
  code: string;
  name: string;
  taxType: string;
  ratePercent: number;
  isRecoverable: boolean;
  isActive: boolean;
  groupCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type TaxRateUpsertRequest = {
  code: string;
  name: string;
  taxType: string;
  ratePercent: number;
  isRecoverable: boolean;
  isActive: boolean;
};

export type TaxGroup = {
  id: number;
  name: string;
  isActive: boolean;
  /** Tax on 100 at these rates (compound included). */
  effectiveRatePercent: number;
  rates: TaxGroupRateItem[];
  createdAt: string;
  updatedAt: string | null;
};

export type TaxGroupUpsertRequest = {
  name: string;
  isActive: boolean;
  rates: { taxRateId: number; isCompound: boolean }[];
};

/**
 * Where money is paid from or received into (Cash, a bank, bKash, ...), with the ledger head each kind of payment
 * posts to (GET /api/inventory/payment-sources). Shared by every organization, like the chart of accounts.
 */
export type PaymentSource = {
  id: number;
  objectId: number;
  nameEn: string;
  nameLocal: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  lines: PaymentSourceLine[];
};

export type PaymentSourceLine = {
  id: number;
  paymentFor: string;
  /** The ledger head: an acc_sub_class id. */
  accSubClassId: number;
  accountCode: string;
  accountName: string;
  /** "Map class/Main class/Account class/Parent class". */
  accountPath: string | null;
};

export type PaymentSourceUpsertRequest = {
  nameEn: string;
  nameLocal: string | null;
  isActive: boolean;
  /** Lines with an id are kept and updated, new ones (no id) added; lines left out are deleted. */
  lines: { id: number | null; paymentFor: string; accSubClassId: number }[];
};

// ---- Documents

/** A line as the user enters it; quantity and price are in unitId. */
export type PurchaseLineRequest = {
  productId: number;
  unitId: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number | null;
  taxGroupId: number | null;
  description: string | null;
  purchaseOrderLineId: number | null;
  goodsReceiptLineId: number | null;
  purchaseInvoiceLineId: number | null;
  batchNo: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  batchId: number | null;
  rejectedQuantity: number;
  serialNos: string[];
  remarks: string | null;
};

export type PurchaseChargeRequest = {
  chargeName: string;
  amount: number;
  allocationMethod: "Value" | "Quantity";
  /** Billed by the supplier on this document (adds to what is owed to them). */
  onSupplierBill: boolean;
  payeeSupplierId: number | null;
};

export type LineTaxItem = { taxRateId: number; taxCode: string; taxableAmount: number; taxAmount: number; isRecoverable: boolean };

export type PurchaseLine = {
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
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxGroupId: number | null;
  taxGroupName: string | null;
  taxAmount: number;
  lineTotal: number;
  purchaseOrderLineId: number | null;
  goodsReceiptLineId: number | null;
  purchaseInvoiceLineId: number | null;
  batchNo: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  batchId: number | null;
  chargeAmount: number;
  /** Per base unit, base currency. */
  landedUnitCost: number;
  rejectedQuantity: number;
  /** Order lines: received so far. */
  receivedQuantity: number;
  /** Order and receipt lines: billed so far. */
  invoicedQuantity: number;
  returnedQuantity: number;
  serialNos: string[];
  remarks: string | null;
  taxes: LineTaxItem[];
};

export type PurchaseCharge = {
  id: number;
  chargeName: string;
  amount: number;
  allocationMethod: "Value" | "Quantity";
  payeeSupplierId: number | null;
  payeeName: string | null;
  onSupplierBill: boolean;
};

export type InvoiceAllocationItem = {
  id: number;
  allocationDate: string;
  amount: number;
  sourceType: "Payment" | "Return";
  sourceId: number;
  sourceNo: string;
};

export type PurchaseInvoice = {
  id: number;
  objectId: string;
  invoiceNo: string;
  invoiceDate: string;
  purchaseType: PurchaseType;
  dueDate: string | null;
  supplierId: number | null;
  /** Supplier name, or the walk-in name on a cash purchase. */
  supplierName: string | null;
  supplierMobile: string | null;
  receivesStock: boolean;
  warehouseId: number | null;
  warehouseName: string | null;
  purchaseOrderId: number | null;
  purchaseOrderNo: string | null;
  supplierInvoiceNo: string | null;
  supplierInvoiceDate: string | null;
  taxInvoiceNo: string | null;
  currencyLookupDataId: number;
  currency: string;
  exchangeRate: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  chargeAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paidAmount: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReferenceNo: string | null;
  /** The chosen payment source line (inv_payment_source_d). */
  invPaymentSourceDId: number | null;
  paymentSourceId: number | null;
  paymentSourceName: string | null;
  paymentSourceType: string | null;
  settledAmount: number;
  dueAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  paymentStatus: PaymentStatus;
  /** The bill voucher made by finalizing the invoice, while it is there; the invoice is locked meanwhile. */
  billVoucherId: number | null;
  billVoucherRefNo: string | null;
  billVoucherStatus: string | null;
  lineCount: number;
  postedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  lines: PurchaseLine[];
  charges: PurchaseCharge[];
  allocations: InvoiceAllocationItem[];
};

export type PurchaseInvoiceUpsertRequest = {
  invoiceDate: string;
  purchaseType: PurchaseType;
  dueDate: string | null;
  supplierId: number | null;
  supplierName: string | null;
  supplierMobile: string | null;
  /**
   * Adds the supplier to the supplier list on save (name, mobile and address line 1 required) and links the
   * invoice to it. Without it, a cash purchase from a supplier not on file keeps the name and mobile on the invoice only.
   */
  addSupplier: boolean;
  supplierAddressLine1: string | null;
  /** True: a direct purchase that receives stock. False: bills goods receipts. */
  receivesStock: boolean;
  warehouseId: number | null;
  purchaseOrderId: number | null;
  supplierInvoiceNo: string | null;
  supplierInvoiceDate: string | null;
  taxInvoiceNo: string | null;
  currencyLookupDataId: number | null;
  exchangeRate: number;
  roundOffAmount: number;
  /** Paid on the spot (Credit only; Cash is paid in full). */
  paidAmount: number;
  paymentMethod: string | null;
  paymentProvider: string | null;
  paymentReferenceNo: string | null;
  /** Required: the payment source line (inv_payment_source_d). */
  invPaymentSourceDId: number | null;
  remarks: string | null;
  lines: PurchaseLineRequest[];
  charges: PurchaseChargeRequest[];
};

export type PurchaseOrder = {
  id: number;
  objectId: string;
  orderNo: string;
  orderDate: string;
  expectedDate: string | null;
  supplierId: number;
  supplierName: string;
  warehouseId: number;
  warehouseName: string;
  supplierReference: string | null;
  currencyLookupDataId: number;
  currency: string;
  exchangeRate: number;
  paymentTermsDays: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  chargeAmount: number;
  totalAmount: number;
  status: "Draft" | "Approved" | "PartiallyReceived" | "Received" | "Closed" | "Cancelled";
  lineCount: number;
  approvedAt: string | null;
  termsAndConditions: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  lines: PurchaseLine[];
};

export type PurchaseOrderUpsertRequest = {
  orderDate: string;
  expectedDate: string | null;
  supplierId: number;
  warehouseId: number;
  supplierReference: string | null;
  currencyLookupDataId: number | null;
  exchangeRate: number;
  paymentTermsDays: number;
  chargeAmount: number;
  termsAndConditions: string | null;
  remarks: string | null;
  lines: PurchaseLineRequest[];
};

export type GoodsReceipt = {
  id: number;
  objectId: string;
  receiptNo: string;
  receiptDate: string;
  supplierId: number | null;
  supplierName: string | null;
  warehouseId: number;
  warehouseName: string;
  purchaseOrderId: number | null;
  purchaseOrderNo: string | null;
  supplierChallanNo: string | null;
  supplierChallanDate: string | null;
  currencyLookupDataId: number;
  currency: string;
  exchangeRate: number;
  /** Landed value received, base currency. */
  totalValue: number;
  status: "Draft" | "Posted" | "Cancelled";
  isFullyInvoiced: boolean;
  lineCount: number;
  postedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  lines: PurchaseLine[];
  charges: PurchaseCharge[];
};

export type GoodsReceiptUpsertRequest = {
  receiptDate: string;
  supplierId: number;
  warehouseId: number;
  purchaseOrderId: number | null;
  supplierChallanNo: string | null;
  supplierChallanDate: string | null;
  currencyLookupDataId: number | null;
  exchangeRate: number;
  remarks: string | null;
  lines: PurchaseLineRequest[];
  charges: PurchaseChargeRequest[];
};

export type PurchaseReturn = {
  id: number;
  objectId: string;
  returnNo: string;
  returnDate: string;
  supplierId: number | null;
  supplierName: string | null;
  warehouseId: number;
  warehouseName: string;
  goodsReceiptId: number | null;
  goodsReceiptNo: string | null;
  purchaseInvoiceId: number | null;
  purchaseInvoiceNo: string | null;
  reason: string;
  settlementType: "AdjustDue" | "Refund";
  refundMethod: string | null;
  refundProvider: string | null;
  refundReferenceNo: string | null;
  currencyLookupDataId: number;
  currency: string;
  exchangeRate: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  lineCount: number;
  postedAt: string | null;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  lines: PurchaseLine[];
};

export type PurchaseReturnUpsertRequest = {
  returnDate: string;
  supplierId: number | null;
  supplierName: string | null;
  warehouseId: number;
  goodsReceiptId: number | null;
  purchaseInvoiceId: number | null;
  reason: string;
  settlementType: "AdjustDue" | "Refund";
  refundMethod: string | null;
  refundProvider: string | null;
  refundReferenceNo: string | null;
  currencyLookupDataId: number | null;
  exchangeRate: number;
  remarks: string | null;
  lines: PurchaseLineRequest[];
};

export type PaymentAllocationItem = {
  purchaseInvoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  invoiceTotal: number;
  amount: number;
};

export type SupplierPayment = {
  id: number;
  objectId: string;
  paymentNo: string;
  paymentDate: string;
  supplierId: number;
  supplierName: string;
  paymentType: "Payment" | "Refund";
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
  status: "Posted" | "Cancelled";
  postedAt: string | null;
  remarks: string | null;
  createdAt: string;
  allocations: PaymentAllocationItem[];
};

export type SupplierPaymentCreateRequest = {
  paymentDate: string;
  supplierId: number;
  paymentType: "Payment" | "Refund";
  paymentMethod: string;
  paymentProvider: string | null;
  referenceNo: string | null;
  chequeDate: string | null;
  currencyLookupDataId: number | null;
  exchangeRate: number;
  amount: number;
  taxDeductedAmount: number;
  remarks: string | null;
  allocations: { purchaseInvoiceId: number; amount: number }[];
  /** No allocations given: settle the oldest open invoices first. */
  autoAllocate: boolean;
};

export type OpenPurchaseInvoice = {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string | null;
  supplierInvoiceNo: string | null;
  currencyLookupDataId: number;
  totalAmount: number;
  settledAmount: number;
  dueAmount: number;
};

// ---- Reports

export type SupplierLedgerEntry = {
  entryDate: string | null;
  /** Opening, Invoice, PaidOnInvoice, Return, ReturnRefund, Payment, Refund */
  entryType: string;
  documentId: number | null;
  documentNo: string | null;
  debitAmount: number;
  creditAmount: number;
  balance: number;
};

export type SupplierLedger = {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  from: string;
  to: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: SupplierLedgerEntry[];
};

export type SupplierDueRow = {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  mobile: string | null;
  balance: number;
  openInvoiceCount: number;
  notDue: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  over90: number;
  oldestDueDate: string | null;
};

export type PurchaseRegisterRow = {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  purchaseType: PurchaseType;
  supplierName: string | null;
  supplierInvoiceNo: string | null;
  taxInvoiceNo: string | null;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  chargeAmount: number;
  totalAmount: number;
  settledAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus;
};

export type PurchaseByProductRow = {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string | null;
  baseUnitCode: string;
  quantity: number;
  netAmount: number;
  taxAmount: number;
  averagePrice: number;
  invoiceCount: number;
  lastPurchaseDate: string | null;
};

export const PURCHASE_LABELS: Record<string, string> = {
  MobileWallet: "Mobile wallet",
  PartiallyPaid: "Partially paid",
  PartiallyReceived: "Partially received",
  AdjustDue: "Deduct from dues",
  WrongItem: "Wrong item",
  QualityIssue: "Quality issue",
  PaidOnInvoice: "Paid on invoice",
  ReturnRefund: "Return refund",
  SalesTax: "Sales tax",
};

export const purchaseLabel = (value: string | null | undefined) => (value ? (PURCHASE_LABELS[value] ?? value) : "—");
