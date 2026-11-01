// Contract of ThinkTechErpAPI's Accounting area (Areas/Accounting). JSON is camelCase; dates are
// "YYYY-MM-DD" (C# DateOnly). Every call works in the organization chosen in the header.
// Balances are debit minus credit: + is a debit balance, − a credit balance.

export const ACCOUNTING_VIEW_PERMISSION = "ACCOUNTING.V";
export const ACCOUNTING_MANAGE_PERMISSION = "ACCOUNTING.M";

/** The chart's five levels (the acc_* tables); level 5 (Sub Class) holds the ledger heads vouchers post to. */
export const ACCOUNT_LEVELS = ["Parent Class", "Account Class", "Main Class", "Map Class", "Sub Class"] as const;

export const ACCOUNT_NATURES = ["Asset", "Liability", "Equity", "Income", "Expense"] as const;
/** Suppliers and customers are one list (purchase.supplier); a party can be either or both. */
export const PARTY_TYPES = ["Supplier", "Customer"] as const;
/** The currency a voucher line takes when none is chosen; line amounts are always in it. */
export const LOCAL_CURRENCY = "BDT";
/** Entered on the voucher screen; bill payments and collections have their own screens. */
export const GENERAL_VOUCHER_TYPES = ["Journal", "Payment", "Receipt", "Contra"] as const;
export const VOUCHER_TYPES = [...GENERAL_VOUCHER_TYPES, "BillPayment", "BillCollection"] as const;
export const VOUCHER_STATUSES = ["Draft", "Posted", "Cancelled"] as const;
export const PAYMENT_METHODS = ["Cash", "Bank", "Cheque", "MobileWallet", "Card", "Other"] as const;

export type AccountNature = (typeof ACCOUNT_NATURES)[number];
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

// ---- Lookups

/** A sub class (accounting.acc_sub_class): a ledger head vouchers post to (GET /api/accounting/ledger-heads). */
export type LedgerHeadOption = {
  id: number;
  code: string;
  name: string;
  nature: AccountNature | "";
  /** "Main class › Map class". */
  path: string | null;
};

/** A supplier or customer (GET /api/accounting/parties). */
export type PartyOption = {
  id: number;
  code: string;
  name: string;
  mobile: string | null;
  isSupplier: boolean;
  isCustomer: boolean;
  isActive: boolean;
};

// ---- Vouchers

export type VoucherLine = {
  id: number;
  lineNo: number;
  /** The acc_sub_class id. */
  accountId: number;
  accountCode: string;
  accountName: string;
  /** The supplier or customer the line is for, if any. */
  partyId: number | null;
  partyCode: string | null;
  partyName: string | null;
  /** In BDT, whatever the line's currency. */
  debitAmount: number;
  creditAmount: number;
  currencyLookupDataId: number;
  currency: string | null;
  localExchangeRate: number;
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
  partyId: number | null;
  debitAmount: number;
  creditAmount: number;
  /** Null = BDT. */
  currencyLookupDataId: number | null;
  /** Null = 1. */
  localExchangeRate: number | null;
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
  /** The sub class their balance is kept on (Accounts Payable, Accounts Receivable, ...). */
  partyAccountId: number;
  /** The cash or bank sub class paid from (or deposited to). */
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
  nature: AccountNature | "";
  partyId: number | null;
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

export type PartyBalance = { accountId: number; partyId: number; balance: number };

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

/**
 * The chart of accounts screen's tree, on the accounting.acc_* tables (as in MediDesk) and shared by every
 * organization: parent class → account class → main class → map class → sub class.
 */
export type AccountClassKind = "parent" | "ac" | "main" | "map" | "sub";

/** Parent and account classes are fixed; these are added, renamed and deleted from the tree. */
export type EditableAccountClassKind = "main" | "map" | "sub";

export const EDITABLE_ACCOUNT_CLASS_KINDS: readonly EditableAccountClassKind[] = ["main", "map", "sub"];

/** The longest name each table holds (main_name and sub_name varchar(60), map_name varchar(100)). */
export const ACCOUNT_CLASS_MAX_NAME: Record<EditableAccountClassKind, number> = { main: 60, map: 100, sub: 60 };

export interface AccountClassNode {
  kind: AccountClassKind;
  id: number;
  code: string | null;
  name: string | null;
  children: AccountClassNode[];
}
