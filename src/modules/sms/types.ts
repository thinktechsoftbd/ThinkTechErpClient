// Mirrors ThinkTechErpDomain.Models.Sms (System.Text.Json camelCase; DateTimeOffset as ISO strings).

export type SmsClient = {
  clientId: string;
  displayName: string;
  isActive: boolean;
  availableSms: number;
  totalAllocatedSms: number;
  totalConsumedSms: number;
  createdAt: string;
  updatedAt: string;
};

export type SmsPlatformBalance = {
  totalPurchasedSms: number;
  unallocatedSms: number;
  assignedAvailableSms: number;
  consumedSms: number;
  totalAvailableSms: number;
  updatedAt: string;
};

export type SmsAdnPurchase = {
  purchaseId: number;
  transactionId: number;
  provider: string;
  providerReference: string | null;
  smsQuantity: number;
  amountPaid: number | null;
  currency: string | null;
  exchangeRate?: number | null;
  purchasedAt: string;
  note: string | null;
};

export type SmsClientAllocation = {
  allocationId: number;
  transactionId: number;
  clientId: string;
  clientName: string;
  smsQuantity: number;
  note: string | null;
  isFinalized: boolean;
  allocatedAt: string;
};

export type SmsUsageRecord = {
  usageId: number;
  transactionId: number;
  clientId: string;
  requestReference: string;
  providerMessageId: string | null;
  recipient: string | null;
  smsQuantity: number;
  sentAt: string;
};

export type SmsBalanceTransaction = {
  transactionId: number;
  transactionType: string;
  quantity: number;
  clientId: string | null;
  platformDelta: number;
  clientDelta: number;
  platformBalanceAfter: number;
  clientBalanceAfter: number | null;
  providerReference: string | null;
  requestReference: string | null;
  note: string | null;
  createdAt: string;
};

export type SmsClientCreateRequest = { clientId: string; displayName: string };
export type SmsClientUpdateRequest = { displayName?: string | null; isActive?: boolean | null };
export type SmsAllocationRequest = { smsQuantity: number; note?: string | null; isFinalized?: boolean };
export type SmsAllocationUpdateRequest = { note?: string | null };
export type SmsUsageRequest = {
  smsQuantity: number;
  requestReference: string;
  recipient?: string | null;
  providerMessageId?: string | null;
};
export type SmsPurchaseRequest = {
  smsQuantity: number;
  providerReference?: string | null;
  amountPaid?: number | null;
  currency?: string | null;
  exchangeRate?: number | null;
  note?: string | null;
};
export type SmsPurchaseUpdateRequest = {
  providerReference: string;
  amountPaid: number;
  currency: "BDT" | "USD";
  exchangeRate?: number | null;
  note?: string | null;
};

/** Page size used by SMS list screens (the API allows 1–500). */
export const SMS_PAGE_SIZE = 25;
