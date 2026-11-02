// Contract of ThinkTechErpAPI's SMS area (Areas/SMS). JSON is camelCase; dates are "YYYY-MM-DD"
// (C# DateOnly). SMS are bought from providers (gateways) and allocated to organizations, which use them.

export const SMS_VIEW_PERMISSION = "SMS.V";
export const SMS_MANAGE_PERMISSION = "SMS.M";

/** Purchases are converted to this currency; the API forces an exchange rate of 1 for it. */
export const LOCAL_CURRENCY = "BDT";

/** Whether a Currency lookup value (e.g. "BDT") is the local currency. */
export function isLocalCurrency(currency: string | undefined) {
  return currency?.toUpperCase() === LOCAL_CURRENCY;
}

// ---- Providers

/** An SMS gateway. Its API password and key are write-only: the API only says whether they are set. */
export type SmsProvider = {
  id: number;
  objectId: string;
  name: string;
  code: string;
  apiBaseUrl: string | null;
  apiUsername: string | null;
  hasApiPassword: boolean;
  hasApiKey: boolean;
  isActive: boolean;
  purchasedSms: number;
  allocatedSms: number;
  /** Bought from the provider and not yet allocated to an organization. */
  availableSms: number;
  createdAt: string;
  updatedAt: string | null;
};

export type SmsProviderUpsertRequest = {
  name: string;
  /** Upper-cased by the API; unique. */
  code: string;
  apiBaseUrl: string | null;
  apiUsername: string | null;
  /** Null keeps the stored password, "" removes it, a value replaces it. */
  apiPassword: string | null;
  /** Null keeps the stored key, "" removes it, a value replaces it. */
  apiKey: string | null;
  isActive: boolean;
};

// ---- Purchases

export type SmsPurchase = {
  id: number;
  objectId: string;
  providerId: number;
  providerName: string;
  providerCode: string;
  purchaseDate: string;
  invoiceNumber: string | null;
  referenceNumber: string | null;
  smsQuantity: number;
  /** A value of the Currency lookup list. */
  currencyId: number;
  currency: string;
  unitPrice: number;
  totalAmount: number;
  /** BDT per unit of the purchase currency. */
  localExchangeRate: number;
  /** The total in BDT. */
  localTotalAmount: number;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type SmsPurchaseUpsertRequest = {
  providerId: number;
  purchaseDate: string;
  invoiceNumber: string | null;
  referenceNumber: string | null;
  smsQuantity: number;
  currencyId: number;
  unitPrice: number;
  /** Null: quantity × unit price. */
  totalAmount: number | null;
  /** BDT per unit of the currency; ignored (1) for BDT. */
  localExchangeRate: number;
  remarks: string | null;
};

// ---- Allocations

export type SmsAllocation = {
  id: number;
  objectId: string;
  providerId: number;
  providerName: string;
  providerCode: string;
  organizationObjectId: string;
  organizationId: number;
  organizationName: string;
  organizationCode: string | null;
  allocatedSms: number;
  allocationDate: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type SmsAllocationUpsertRequest = {
  providerId: number;
  organizationObjectId: string;
  allocatedSms: number;
  allocationDate: string;
  remarks: string | null;
};

// ---- Organizations

/** An organization's SMS: allocated to it, used by it and left. */
export type SmsOrganizationBalance = {
  organizationId: number;
  /** The organization's Object Id (a UUID), used by the SMS endpoints. */
  objectId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  /** Finalized in Security → Organizations: its allocations are locked (no new, changed or deleted ones). */
  isFinalized: boolean;
  allocatedSms: number;
  smsUsage: number;
  availableSms: number;
  allocationCount: number;
  lastAllocationDate: string | null;
};

// ---- Overview

export type SmsOverview = {
  providerCount: number;
  activeProviderCount: number;
  purchasedSms: number;
  allocatedSms: number;
  /** Bought and not yet allocated, all providers. */
  unallocatedSms: number;
  usedSms: number;
  /** Allocated to organizations and not yet used. */
  organizationAvailableSms: number;
  organizationCount: number;
  /** What all purchases cost, in BDT. */
  purchaseSpend: number;
  providers: SmsProvider[];
  /** At most 5 organizations with SMS, the lowest balance first. */
  lowestBalances: SmsOrganizationBalance[];
};

/** "Name (CODE)" for pickers and tables. */
export function providerLabel(provider: { name: string; code: string }) {
  return `${provider.name} (${provider.code})`;
}

export function organizationLabel(organization: { name: string; code: string | null }) {
  return organization.code ? `${organization.name} (${organization.code})` : organization.name;
}
