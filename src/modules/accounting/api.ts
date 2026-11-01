import "server-only";
import { apiFetch } from "@/core/api/client";
import type { PagedResult } from "@/modules/security/types";
import type {
  BalanceSheet,
  BillVoucherRequest,
  ChartAccount,
  ChartAccountUpsertRequest,
  LedgerHeadOption,
  PartyBalance,
  PartyOption,
  PartyType,
  SubsidiaryLedger,
  TrialBalance,
  Voucher,
  VoucherListQuery,
  VoucherUpsertRequest,
} from "./types";

const base = "/api/accounting";

export const accountingApi = {
  chart: {
    /** Every account, every level, flat (parentId links the tree). */
    list: () => apiFetch<ChartAccount[]>(`${base}/chart-of-accounts`),
    create: (body: ChartAccountUpsertRequest) => apiFetch<ChartAccount>(`${base}/chart-of-accounts`, { method: "POST", body }),
    update: (id: number, body: ChartAccountUpsertRequest) =>
      apiFetch<ChartAccount>(`${base}/chart-of-accounts/${id}`, { method: "PUT", body }),
    /** Ticking activates the branch and its parents; clearing deactivates the branch. */
    setActive: (id: number, isActive: boolean) =>
      apiFetch<ChartAccount>(`${base}/chart-of-accounts/${id}/active`, { method: "PUT", body: { isActive } }),
    remove: (id: number) => apiFetch<void>(`${base}/chart-of-accounts/${id}`, { method: "DELETE" }),
    /** Adds the ready-made chart to an organization without accounts. */
    importStandard: () => apiFetch<ChartAccount[]>(`${base}/chart-of-accounts/standard`, { method: "POST", body: {} }),
    ledgerHeads: (query: {
      search?: string;
      ledgerTypes?: string;
      partyType?: PartyType;
      ids?: string;
      includeInactive?: boolean;
      limit?: number;
    }) => apiFetch<LedgerHeadOption[]>(`${base}/chart-of-accounts/ledger-heads`, { query }),
  },
  parties: (type: PartyType, query: { search?: string; ids?: string; limit?: number } = {}) =>
    apiFetch<PartyOption[]>(`${base}/parties`, { query: { type, ...query } }),

  vouchers: {
    list: (query: VoucherListQuery) => apiFetch<PagedResult<Voucher>>(`${base}/vouchers`, { query }),
    get: (id: number) => apiFetch<Voucher>(`${base}/vouchers/${id}`),
    create: (body: VoucherUpsertRequest, post = false) =>
      apiFetch<Voucher>(`${base}/vouchers`, { method: "POST", body, query: { post: post || undefined } }),
    update: (id: number, body: VoucherUpsertRequest, post = false) =>
      apiFetch<Voucher>(`${base}/vouchers/${id}`, { method: "PUT", body, query: { post: post || undefined } }),
    remove: (id: number) => apiFetch<void>(`${base}/vouchers/${id}`, { method: "DELETE" }),
    /** post or cancel */
    action: (id: number, action: "post" | "cancel") => apiFetch<Voucher>(`${base}/vouchers/${id}/${action}`, { method: "POST", body: {} }),
  },
  billPayments: {
    list: (query: VoucherListQuery) => apiFetch<PagedResult<Voucher>>(`${base}/bill-payments`, { query }),
    /** Posted in one step. */
    create: (body: BillVoucherRequest) => apiFetch<Voucher>(`${base}/bill-payments`, { method: "POST", body }),
  },
  billCollections: {
    list: (query: VoucherListQuery) => apiFetch<PagedResult<Voucher>>(`${base}/bill-collections`, { query }),
    /** Posted in one step. */
    create: (body: BillVoucherRequest) => apiFetch<Voucher>(`${base}/bill-collections`, { method: "POST", body }),
  },

  reports: {
    subsidiaryLedger: (query: { accountId: number; supplierId?: number; customerId?: number; from?: string; to?: string }) =>
      apiFetch<SubsidiaryLedger>(`${base}/reports/subsidiary-ledger`, { query }),
    trialBalance: (query: { from?: string; to?: string; includeZero?: boolean }) =>
      apiFetch<TrialBalance>(`${base}/reports/trial-balance`, { query }),
    balanceSheet: (query: { asOf?: string }) => apiFetch<BalanceSheet>(`${base}/reports/balance-sheet`, { query }),
    partyBalance: (query: { accountId: number; supplierId?: number; customerId?: number; asOf?: string }) =>
      apiFetch<PartyBalance>(`${base}/reports/party-balance`, { query }),
  },
};
