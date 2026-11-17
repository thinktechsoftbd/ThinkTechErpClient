// Contract of the API's Warranty area (/api/warranty/*): warranty policies, the products sold with them, warranty
// cards (issued when a sales invoice posts), service jobs and supplier claims. JSON is camelCase, dates "YYYY-MM-DD",
// timestamps ISO in UTC.

export const WARRANTY_VIEW_PERMISSION = "WARRANTY.V";
export const WARRANTY_MANAGE_PERMISSION = "WARRANTY.M";

/** The lookup list of device kinds a job is opened for. */
export const SERVICE_DEVICE_TYPE_LOOKUP_TABLE = "Service Device Type";

// ---- Policies and products

export type WarrantyPolicy = {
  id: number;
  name: string;
  warrantyMonths: number;
  replacementDays: number;
  coversParts: boolean;
  coversLabor: boolean;
  terms: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type WarrantyPolicyUpsertRequest = {
  name: string;
  warrantyMonths: number;
  replacementDays: number;
  coversParts: boolean;
  coversLabor: boolean;
  terms: string | null;
  isActive: boolean;
};

export type WarrantyPolicyOption = {
  id: number;
  name: string;
  warrantyMonths: number;
  replacementDays: number;
  isActive: boolean;
};

export type ProductWarrantyItem = {
  productId: number;
  productCode: string;
  productName: string;
  productType: string;
  trackingType: string;
  categoryName: string | null;
  brandName: string | null;
  warrantyPolicyId: number | null;
  warrantyPolicyName: string | null;
  isActive: boolean;
};

export type OptionItem = { id: number; name: string; code: string | null };

// ---- Warranty cards

export const CARD_STATUSES = ["Active", "Replaced", "Void"] as const;
export const COVERAGES = ["InReplacement", "InWarranty", "Expired", "Replaced", "Void"] as const;
export const CARD_SOURCES = ["Sale", "Replacement", "Manual"] as const;
export type Coverage = (typeof COVERAGES)[number];

export type WarrantyCard = {
  id: number;
  warrantyNo: string;
  source: (typeof CARD_SOURCES)[number];
  salesInvoiceId: number | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  productId: number;
  productCode: string;
  productName: string;
  brandName: string | null;
  serialNumberId: number | null;
  serialNo: string | null;
  quantity: number;
  customerId: number | null;
  customerCode: string | null;
  customerName: string | null;
  customerMobile: string | null;
  warrantyPolicyId: number | null;
  warrantyPolicyName: string | null;
  startDate: string;
  replacementEndDate: string | null;
  endDate: string;
  coversParts: boolean;
  coversLabor: boolean;
  terms: string | null;
  supplierId: number | null;
  supplierName: string | null;
  supplierWarrantyEndDate: string | null;
  replacesRegistrationId: number | null;
  replacesWarrantyNo: string | null;
  replacedByRegistrationId: number | null;
  replacedByWarrantyNo: string | null;
  status: (typeof CARD_STATUSES)[number];
  coverage: Coverage;
  daysRemaining: number;
  voidReason: string | null;
  remarks: string | null;
  jobCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type WarrantyCardCreateRequest = {
  productId: number;
  serialNo: string | null;
  quantity: number;
  customerId: number | null;
  customerName: string | null;
  customerMobile: string | null;
  warrantyPolicyId: number | null;
  startDate: string;
  endDate: string | null;
  remarks: string | null;
};

export type SerialSaleInfo = {
  serialNumberId: number;
  serialNo: string;
  productId: number;
  productCode: string;
  productName: string;
  status: string;
  salesInvoiceId: number | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  customerName: string | null;
  customerMobile: string | null;
  hasActiveCard: boolean;
};

export type WarrantyCheckResult = {
  query: string;
  cards: WarrantyCard[];
  serials: SerialSaleInfo[];
  jobs: ServiceJob[];
};

// ---- Service jobs

export const JOB_TYPES = ["Warranty", "Paid"] as const;
export const SERVICE_LOCATIONS = ["InShop", "OnSite"] as const;
export const PRIORITIES = ["Normal", "Urgent"] as const;
/** The statuses a job can be moved to with "Update status" (Delivered and Cancelled have their own actions). */
export const OPEN_STATUSES = ["Received", "Diagnosing", "AwaitingApproval", "InRepair", "WaitingForParts", "AtSupplier", "Ready"] as const;
export const JOB_STATUSES = [...OPEN_STATUSES, "Delivered", "Cancelled"] as const;
export const RESOLUTIONS = ["Repaired", "Replaced", "NoFaultFound", "NotRepairable", "CustomerDeclined"] as const;
export type JobType = (typeof JOB_TYPES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

export type ServiceJobItem = {
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
  quantity: number;
  batchId: number | null;
  batchNo: string | null;
  serialNumberId: number | null;
  serialNo: string | null;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  isWarrantyCovered: boolean;
  salesInvoiceLineId: number | null;
  remarks: string | null;
};

export type ServiceJobStatusChange = {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  customerNotified: boolean;
  changedAt: string;
  changedBy: number | null;
  changedByName: string | null;
};

export type ServiceJob = {
  id: number;
  jobNo: string;
  receivedAt: string;
  jobType: JobType;
  serviceLocation: (typeof SERVICE_LOCATIONS)[number];
  priority: (typeof PRIORITIES)[number];
  customerId: number | null;
  customerCode: string | null;
  customerName: string | null;
  customerMobile: string | null;
  serviceAddress: string | null;
  deviceTypeLookupDataId: number;
  deviceType: string;
  productId: number | null;
  productCode: string | null;
  productName: string | null;
  serialNumberId: number | null;
  brandName: string | null;
  modelName: string | null;
  serialNo: string | null;
  accessoriesReceived: string | null;
  physicalCondition: string | null;
  problemDescription: string;
  warrantyRegistrationId: number | null;
  warrantyNo: string | null;
  warrantyCoverage: Coverage | null;
  warrantyEndDate: string | null;
  warrantyVoidReason: string | null;
  technicianUserId: number | null;
  technicianName: string | null;
  diagnosis: string | null;
  estimatedAmount: number;
  approvalStatus: "NotRequired" | "Pending" | "Approved" | "Rejected";
  approvedAt: string | null;
  promisedDate: string | null;
  status: JobStatus;
  resolution: (typeof RESOLUTIONS)[number] | null;
  resolutionNote: string | null;
  completedAt: string | null;
  deliveredAt: string | null;
  deliveredToName: string | null;
  cancelReason: string | null;
  salesInvoiceId: number | null;
  invoiceNo: string | null;
  invoiceStatus: string | null;
  invoiceTotal: number | null;
  invoiceDue: number | null;
  itemsTotal: number;
  itemCount: number;
  openClaimCount: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
  items: ServiceJobItem[];
  history: ServiceJobStatusChange[];
  claims: SupplierClaim[];
};

export type ServiceJobUpsertRequest = {
  jobType: JobType;
  serviceLocation: string;
  priority: string;
  customerId: number | null;
  customerName: string | null;
  customerMobile: string | null;
  serviceAddress: string | null;
  deviceTypeLookupDataId: number;
  productId: number | null;
  serialNo: string | null;
  brandName: string | null;
  modelName: string | null;
  accessoriesReceived: string | null;
  physicalCondition: string | null;
  problemDescription: string;
  warrantyRegistrationId: number | null;
  warrantyVoidReason: string | null;
  technicianUserId: number | null;
  diagnosis: string | null;
  estimatedAmount: number;
  promisedDate: string | null;
  remarks: string | null;
};

export type ServiceJobItemRequest = {
  productId: number;
  description: string | null;
  unitId: number;
  quantity: number;
  serialNo: string | null;
  unitPrice: number;
  discountAmount: number;
  isWarrantyCovered: boolean;
  remarks: string | null;
};

export type ServiceJobInvoiceRequest = {
  saleType: "Cash" | "Credit";
  paidAmount: number;
  paymentMethod: string | null;
  remarks: string | null;
  post: boolean;
};

// ---- Supplier claims

export const CLAIM_STATUSES = ["Sent", "Returned", "Cancelled"] as const;
export const CLAIM_OUTCOMES = ["Repaired", "Replaced", "Rejected", "Credited"] as const;

export type SupplierClaim = {
  id: number;
  claimNo: string;
  serviceJobId: number | null;
  jobNo: string | null;
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  productId: number;
  productCode: string;
  productName: string;
  serialNumberId: number | null;
  serialNo: string | null;
  problemDescription: string;
  sentDate: string;
  supplierReferenceNo: string | null;
  expectedReturnDate: string | null;
  status: (typeof CLAIM_STATUSES)[number];
  returnedDate: string | null;
  outcome: (typeof CLAIM_OUTCOMES)[number] | null;
  replacementSerialNo: string | null;
  serviceChargeAmount: number;
  remarks: string | null;
  daysOut: number;
  createdAt: string;
};

export type SupplierClaimUpsertRequest = {
  serviceJobId: number | null;
  supplierId: number;
  productId: number | null;
  serialNo: string | null;
  problemDescription: string;
  sentDate: string | null;
  supplierReferenceNo: string | null;
  expectedReturnDate: string | null;
  remarks: string | null;
};

export type SupplierClaimReturnRequest = {
  returnedDate: string | null;
  outcome: string;
  replacementSerialNo: string | null;
  serviceChargeAmount: number;
  remarks: string | null;
};

export type SupplierOption = { id: number; code: string; name: string; mobile: string | null; isActive: boolean };

// ---- Labels

const LABELS: Record<string, string> = {
  InReplacement: "In replacement period",
  InWarranty: "In warranty",
  AwaitingApproval: "Awaiting approval",
  InRepair: "In repair",
  WaitingForParts: "Waiting for parts",
  AtSupplier: "At supplier",
  NoFaultFound: "No fault found",
  NotRepairable: "Not repairable",
  CustomerDeclined: "Customer declined",
  InShop: "In the shop",
  OnSite: "On site",
  NotRequired: "Not needed",
};

/** A readable label for an API code, e.g. AwaitingApproval -> "Awaiting approval". */
export function warrantyLabel(code: string | null | undefined) {
  if (!code) return "";
  return LABELS[code] ?? code;
}

/** "12 months" / "2 years", plus the replacement period. */
export function policyPeriod(policy: { warrantyMonths: number; replacementDays: number }) {
  const months = policy.warrantyMonths;
  const term = months % 12 === 0 ? `${months / 12} year${months === 12 ? "" : "s"}` : `${months} month${months === 1 ? "" : "s"}`;
  return policy.replacementDays > 0 ? `${term}, ${policy.replacementDays} days replacement` : term;
}

/** The customer of a job or card: the name on file or the walk-in's name, else the mobile. */
export function partyLabel(party: { customerName: string | null; customerMobile: string | null }) {
  return party.customerName ?? party.customerMobile ?? "Walk-in";
}

/** The device as written on a job: product, else brand and model. */
export function deviceLabel(job: Pick<ServiceJob, "productName" | "brandName" | "modelName" | "deviceType">) {
  return job.productName ?? ([job.brandName, job.modelName].filter(Boolean).join(" ") || job.deviceType);
}
