// Contract of ThinkTechErpAPI's Accounting area (Areas/Accounting). JSON is camelCase; dates are
// "YYYY-MM-DD" (C# DateOnly). Every call works in the organization chosen in the header.
// Balances are debit minus credit: + is a debit balance, − a credit balance.

export const ACCOUNTING_VIEW_PERMISSION = "ACCOUNTING.V";
export const ACCOUNTING_MANAGE_PERMISSION = "ACCOUNTING.M";

/** The chart's five levels; level 5 (Sub Class) holds the ledger heads vouchers post to. */
export const ACCOUNT_LEVELS = ["Parent Class", "Account Class", "Main Class", "Map Class", "Sub Class"] as const;
export const LEDGER_LEVEL = 5;

export const ACCOUNT_NATURES = ["Asset", "Liability", "Equity", "Income", "Expense"] as const;
export const LEDGER_TYPES = ["General", "Cash", "Bank"] as const;
export const PARTY_TYPES = ["Supplier", "Customer"] as const;
/** Entered on the voucher screen; bill payments and collections have their own screens. */
export const GENERAL_VOUCHER_TYPES = ["Journal", "Payment", "Receipt", "Contra"] as const;
export const VOUCHER_TYPES = [...GENERAL_VOUCHER_TYPES, "BillPayment", "BillCollection"] as const;
export const VOUCHER_STATUSES = ["Draft", "Posted", "Cancelled"] as const;
export const PAYMENT_METHODS = ["Cash", "Bank", "Cheque", "MobileWallet", "Card", "Other"] as const;

export type AccountNature = (typeof ACCOUNT_NATURES)[number];
export type LedgerType = (typeof LEDGER_TYPES)[number];
export type PartyType = (typeof PARTY_TYPES)[number];
export type VoucherType = (typeof VOUCHER_TYPES)[number];
export type GeneralVoucherType = (typeof GENERAL_VOUCHER_TYPES)[number];

export function levelName(level: number) {
  return ACCOUNT_LEVELS[level - 1] ?? "Account";
}

/** Assets and expenses grow with debits; liabilities, equity and income with credits. */
export function isDebitNature(nature: string) {
  return nature === "Asset" || nature === "Expense";
}

// ---- Chart of accounts

export type ChartAccount = {
  id: number;
  parentId: number | null;
  level: number;
  code: string;
  name: string;
  nature: AccountNature;
  ledgerType: LedgerType | null;
  partyType: PartyType | null;
  sortOrder: number;
  description: string | null;
  isActive: boolean;
  childCount: number;
  /** Voucher lines use the head, so it can't be deleted. */
  hasEntries: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type ChartAccountUpsertRequest = {
  parentId: number | null;
  /** Empty takes the parent's code plus the next number. */
  code: string | null;
  name: string;
  nature: AccountNature | null;
  ledgerType: LedgerType | null;
  partyType: PartyType | null;
  sortOrder: number;
  description: string | null;
  isActive: boolean;
};

export type LedgerHeadOption = {
  id: number;
  code: string;
  name: string;
  nature: AccountNature;
  ledgerType: LedgerType;
  partyType: PartyType | null;
  /** "Main class › Map class". */
  path: string | null;
  isActive: boolean;
};

export type PartyOption = {
  id: number;
  code: string;
  name: string;
  mobile: string | null;
  isActive: boolean;
};

// ---- Vouchers

export type VoucherLine = {
  id: number;
  lineNo: number;
  accountId: number;
  accountCode: string;
  accountName: string;
  partyType: PartyType | null;
  supplierId: number | null;
  supplierName: string | null;
  customerId: number | null;
  customerName: string | null;
  debitAmount: number;
  creditAmount: number;
  lineNarration: string | null;
};

export type Voucher = {
  id: number;
  objectId: string;
  voucherNo: string;
  voucherType: VoucherType;
  voucherDate: string;
  supplierId: number | null;
  supplierCode: string | null;
  supplierName: string | null;
  customerId: number | null;
  customerCode: string | null;
  customerName: string | null;
  paymentMethod: string | null;
  referenceNo: string | null;
  chequeDate: string | null;
  narration: string | null;
  totalAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  postedAt: string | null;
  postedBy: number | null;
  cancelledAt: string | null;
  cancelledBy: number | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  /** Empty in lists. */
  lines: VoucherLine[];
};

export type VoucherLineRequest = {
  accountId: number;
  supplierId: number | null;
  customerId: number | null;
  debitAmount: number;
  creditAmount: number;
  lineNarration: string | null;
};

export type VoucherUpsertRequest = {
  voucherType: GeneralVoucherType;
  voucherDate: string;
  referenceNo: string | null;
  narration: string | null;
  lines: VoucherLineRequest[];
};

/** A supplier bill payment or a customer bill collection. */
export type BillVoucherRequest = {
  voucherDate: string;
  /** The supplier paid, or the customer collected from. */
  partyId: number;
  /** Their payable (or receivable) head. */
  partyAccountId: number;
  /** The Cash or Bank head paid from (or deposited to). */
  cashAccountId: number;
  amount: number;
  paymentMethod: string;
  referenceNo: string | null;
  chequeDate: string | null;
  narration: string | null;
};

export type VoucherListQuery = {
  search?: string;
  voucherType?: string;
  status?: string;
  supplierId?: number;
  customerId?: number;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

// ---- Reports

export type LedgerEntryRow = {
  voucherId: number;
  voucherNo: string;
  voucherType: VoucherType;
  voucherDate: string;
  referenceNo: string | null;
  narration: string | null;
  partyName: string | null;
  /** The heads on the other side of the voucher. */
  particulars: string | null;
  debitAmount: number;
  creditAmount: number;
  balance: number;
};

export type SubsidiaryLedger = {
  accountId: number;
  accountCode: string;
  accountName: string;
  nature: AccountNature;
  partyType: PartyType | null;
  supplierId: number | null;
  customerId: number | null;
  partyCode: string | null;
  partyName: string | null;
  from: string;
  to: string;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: LedgerEntryRow[];
};

export type AccountBalanceRow = {
  accountId: number;
  code: string;
  name: string;
  nature: AccountNature;
  parentClassId: number;
  parentClassCode: string;
  parentClassName: string;
  accountClassId: number;
  accountClassCode: string;
  accountClassName: string;
  mainClassId: number;
  mainClassCode: string;
  mainClassName: string;
  mapClassId: number;
  mapClassCode: string;
  mapClassName: string;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
};

export type TrialBalance = {
  from: string;
  to: string;
  rows: AccountBalanceRow[];
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
};

export type BalanceSheet = {
  asOf: string;
  rows: AccountBalanceRow[];
  /** Income less expenses up to the date, under equity. */
  netProfit: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
};

export type PartyBalance = { accountId: number; balance: number };

const LABELS: Record<string, string> = {
  BillPayment: "Bill Payment",
  BillCollection: "Bill Collection",
  MobileWallet: "Mobile wallet",
  Journal: "Journal",
  Payment: "Payment",
  Receipt: "Receipt",
  Contra: "Contra",
};

export const accountingLabel = (value: string | null | undefined) => (value ? (LABELS[value] ?? value) : "—");

/** What each voucher type is for, shown under the type picker. */
export const VOUCHER_TYPE_HINTS: Record<GeneralVoucherType, string> = {
  Journal: "Adjustments and transfers between heads, with no cash or bank.",
  Payment: "Money paid out of cash or bank (expenses, advances, ...).",
  Receipt: "Money received into cash or bank.",
  Contra: "Between cash and bank heads: deposits, withdrawals, transfers.",
};
