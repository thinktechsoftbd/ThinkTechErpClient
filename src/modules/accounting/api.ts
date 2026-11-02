import "server-only";
import { apiFetch } from "@/core/api/client";
import type { PagedResult } from "@/modules/security/types";
import type {
  AccountClassNode,
  BalanceSheet,
  BillVoucherRequest,
  EditableAccountClassKind,
  LedgerHeadOption,
  LookupValueOption,
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
  /** Sub classes of the chart for the voucher and report pickers. */
  ledgerHeads: (query: { search?: string; ids?: string; limit?: number }) =>
    apiFetch<LedgerHeadOption[]>(`${base}/ledger-heads`, { query }),
  /** A page of sub classes for the search-as-you-type pickers (by code, name, map or main class). */
  ledgerHeadSearch: (query: { search?: string; limit?: number; offset?: number }) =>
    apiFetch<PagedResult<LedgerHeadOption>>(`${base}/ledger-heads/search`, { query }),
  /** The chart of accounts screen's tree on the acc_* tables (one chart for every organization). */
  accountClasses: {
    tree: () => apiFetch<AccountClassNode[]>(`${base}/account-classes`),
    /** Adds a main class under an account class, a map class under a main class or a sub class under a map class. */
    create: (body: { kind: EditableAccountClassKind; parentId: number; name: string }) =>
      apiFetch<AccountClassNode>(`${base}/account-classes`, { method: "POST", body }),
    rename: (kind: EditableAccountClassKind, id: number, name: string) =>
      apiFetch<AccountClassNode>(`${base}/account-classes/${kind}/${id}`, { method: "PUT", body: { name } }),
    remove: (kind: EditableAccountClassKind, id: number) =>
      apiFetch<void>(`${base}/account-classes/${kind}/${id}`, { method: "DELETE" }),
  },
  /** Suppliers, customers, or both when no type is given; of another of the user's organizations with organizationId. */
  parties: (type: PartyType | undefined, query: { search?: string; ids?: string; limit?: number } = {}, organizationId?: number) =>
    apiFetch<PartyOption[]>(`${base}/parties`, { query: { type, ...query }, organizationId }),

  /** Without organizationId, a voucher is in the organization chosen in the header. */
  vouchers: {
    /** The "Voucher Type" lookup list, inactive values included. */
    types: () => apiFetch<LookupValueOption[]>(`${base}/vouchers/types`),
    /** The "Payment Method" lookup list, inactive values included. */
    paymentMethods: () => apiFetch<LookupValueOption[]>(`${base}/vouchers/payment-methods`),
    list: (query: VoucherListQuery) => apiFetch<PagedResult<Voucher>>(`${base}/vouchers`, { query }),
    get: (id: number) => apiFetch<Voucher>(`${base}/vouchers/${id}`),
    create: (body: VoucherUpsertRequest, organizationId?: number) =>
      apiFetch<Voucher>(`${base}/vouchers`, { method: "POST", body, organizationId }),
    update: (id: number, body: VoucherUpsertRequest, organizationId?: number) =>
      apiFetch<Voucher>(`${base}/vouchers/${id}`, { method: "PUT", body, organizationId }),
    /** Flags a draft deleted. */
    remove: (id: number) => apiFetch<void>(`${base}/vouchers/${id}`, { method: "DELETE" }),
    /** post or cancel */
    action: (id: number, action: "post" | "cancel", organizationId?: number) =>
      apiFetch<Voucher>(`${base}/vouchers/${id}/${action}`, { method: "POST", body: {}, organizationId }),
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
    /** partyId narrows the ledger to one supplier or customer. */
    subsidiaryLedger: (query: { accountId: number; partyId?: number; from?: string; to?: string }) =>
      apiFetch<SubsidiaryLedger>(`${base}/reports/subsidiary-ledger`, { query }),
    trialBalance: (query: { from?: string; to?: string; includeZero?: boolean }) =>
      apiFetch<TrialBalance>(`${base}/reports/trial-balance`, { query }),
    balanceSheet: (query: { asOf?: string }) => apiFetch<BalanceSheet>(`${base}/reports/balance-sheet`, { query }),
    partyBalance: (query: { accountId: number; partyId: number; asOf?: string }) =>
      apiFetch<PartyBalance>(`${base}/reports/party-balance`, { query }),
  },
};
