import "server-only";
import { apiFetch } from "@/core/api/client";
import type {
  SmsAdnPurchase,
  SmsAllocationRequest,
  SmsAllocationUpdateRequest,
  SmsBalanceTransaction,
  SmsClient,
  SmsClientAllocation,
  SmsClientCreateRequest,
  SmsClientUpdateRequest,
  SmsPlatformBalance,
  SmsPurchaseRequest,
  SmsPurchaseUpdateRequest,
  SmsUsageRecord,
  SmsUsageRequest,
} from "./types";

const admin = "/api/sms/admin";
const client = (clientId: string) => `/api/sms/clients/${encodeURIComponent(clientId)}`;

/** Typed wrappers for SmsAdminController and SmsClientController. */
export const smsApi = {
  getPlatformBalance: () => apiFetch<SmsPlatformBalance>(`${admin}/balance`),

  getClients: (limit: number, offset: number) =>
    apiFetch<SmsClient[]>(`${admin}/clients`, { query: { limit, offset } }),

  getClient: (clientId: string) => apiFetch<SmsClient>(`${admin}/clients/${encodeURIComponent(clientId)}`),

  createClient: (body: SmsClientCreateRequest) =>
    apiFetch<SmsClient>(`${admin}/clients`, { method: "POST", body }),

  updateClient: (clientId: string, body: SmsClientUpdateRequest) =>
    apiFetch<SmsClient>(`${admin}/clients/${encodeURIComponent(clientId)}`, { method: "PATCH", body }),

  deleteClient: (clientId: string) =>
    apiFetch<void>(`${admin}/clients/${encodeURIComponent(clientId)}`, { method: "DELETE" }),

  getPurchases: (limit: number, offset: number) =>
    apiFetch<SmsAdnPurchase[]>(`${admin}/purchases`, { query: { limit, offset } }),

  recordPurchase: (body: SmsPurchaseRequest) =>
    apiFetch<{ transactionId: number }>(`${admin}/purchases`, { method: "POST", body }),

  updatePurchase: (purchaseId: number, body: SmsPurchaseUpdateRequest) =>
    apiFetch<void>(`${admin}/purchases/${purchaseId}`, { method: "PATCH", body }),

  getAllocations: (clientId: string | undefined, limit: number, offset: number) =>
    apiFetch<SmsClientAllocation[]>(`${admin}/allocations`, { query: { clientId, limit, offset } }),

  allocate: (clientId: string, body: SmsAllocationRequest) =>
    apiFetch<{ transactionId: number; clientId: string; smsQuantity: number }>(
      `${admin}/clients/${encodeURIComponent(clientId)}/allocations`,
      { method: "POST", body },
    ),

  updateAllocation: (allocationId: number, body: SmsAllocationUpdateRequest) =>
    apiFetch<void>(`${admin}/allocations/${allocationId}`, { method: "PATCH", body }),

  finalizeAllocation: (allocationId: number) =>
    apiFetch<void>(`${admin}/allocations/${allocationId}/finalize`, { method: "POST" }),

  getTransactions: (clientId: string | undefined, limit: number, offset: number) =>
    apiFetch<SmsBalanceTransaction[]>(`${admin}/transactions`, { query: { clientId, limit, offset } }),

  getClientBalance: (clientId: string) => apiFetch<SmsClient>(`${client(clientId)}/balance`),

  getClientUsage: (clientId: string, limit: number, offset: number) =>
    apiFetch<SmsUsageRecord[]>(`${client(clientId)}/usage`, { query: { limit, offset } }),

  recordUsage: (clientId: string, body: SmsUsageRequest) =>
    apiFetch<{ transactionId: number; clientId: string; smsQuantity: number; requestReference: string }>(
      `${client(clientId)}/usage`,
      { method: "POST", body },
    ),
};
