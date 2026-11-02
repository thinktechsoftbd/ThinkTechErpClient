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
export const VOUCHER_STATUSES = ["Draft", "Posted", "Cancelled"] as const;

/**
 * Vouchers take their type and payment method from the "Voucher Type" and "Payment Method" lookup lists
 * (Settings → Lookup Data). A new voucher starts as a Journal Voucher.
 */
export const DEFAULT_VOUCHER_TYPE = "Journal Voucher";
/** Supplier bill payments are entered as one of these voucher types, customer bill collections as one of the others. */
export const BILL_PAYMENT_TYPES = ["Cash Payment Voucher", "Bank Payment Voucher"] as const;
export const BILL_COLLECTION_TYPES = ["Cash Receive Voucher", "Bank Receive Voucher"] as const;

/** How a cheque is crossed. */
export const PAY_TYPES = [
  { value: "AcPay", label: "A/C Pay" },
  { value: "Cash", label: "Cash" },
] as const;

export type AccountNature = (typeof ACCOUNT_NATURES)[number];
export type PartyType = (typeof PARTY_TYPES)[number];
export type PayType = (typeof PAY_TYPES)[number]["value"];

export function levelName(level: number) {
  return ACCOUNT_LEVELS[level - 1] ?? "Account";
}

/** Assets and expenses grow with debits; liabilities, equity and income with credits. */
export function isDebitNature(nature: string) {
  return nature === "Asset" || nature === "Expense";
}

// ---- Lookups

/** A value of a lookup list (GET /api/accounting/vouchers/types and /payment-methods). */
export type LookupValueOption = { id: number; name: string; isActive: boolean };

/** A voucher type named "Bank ..." is a bank voucher: paid by cheque, it needs the cheque no, date and pay type. */
export function isBankVoucherType(name: string | null | undefined) {
  return /^\s*bank/i.test(name ?? "");
}

export function isChequeMethod(name: string | null | undefined) {
  return (name ?? "").trim().toLowerCase() === "cheque";
}

export function payTypeLabel(value: string | null | undefined) {
  return PAY_TYPES.find((type) => type.value === value)?.label ?? value ?? null;
}

/** A sub class (accounting.acc_sub_class): a ledger head vouchers post to (GET /api/accounting/ledger-heads). */
export type LedgerHeadOption = {
  id: number;
  code: string;
  name: string;
  nature: AccountNature | "";
  /** "Map class/Main class/Account class/Parent class". */
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
  /** Sent back when editing a draft, so the line keeps its row and created stamp. */
  id: number;
  lineNo: number;
  /** The acc_sub_class id. */
  accountId: number;
  accountCode: string;
  accountName: string;
  /** "Map class/Main class/Account class/Parent class". */
  accountPath: string | null;
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
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
};

export type Voucher = {
  id: number;
  objectId: string;
  organizationId: number;
  /** Voucher Ref. Number: 00000000001, 00000000002, ... per organization. */
  voucherRefNo: string;
  /** A "Voucher Type" lookup value. */
  voucherTypeId: number;
  voucherType: string;
  voucherDate: string;
  /** A "Payment Method" lookup value. */
  paymentMethodId: number | null;
  paymentMethod: string | null;
  chequeNo: string | null;
  chequeDate: string | null;
  payType: PayType | null;
  narration: string | null;
  /** The suppliers and customers named on the lines. */
  partyNames: string | null;
  totalAmount: number;
  status: "Draft" | "Posted" | "Cancelled";
  postedAt: string | null;
  postedBy: number | null;
  cancelledAt: string | null;
  cancelledBy: number | null;
  createdAt: string;
  createdBy: number | null;
  updatedAt: string | null;
  updatedBy: number | null;
  /** Empty in lists. */
  lines: VoucherLine[];
};

export type VoucherLineRequest = {
  /** The saved line, when editing a draft; null for a new line. */
  id: number | null;
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

/** The cheque details; a bank voucher paid by cheque must have all three. */
type ChequeDetails = {
  chequeNo: string | null;
  chequeDate: string | null;
  payType: PayType | null;
};

export type VoucherUpsertRequest = ChequeDetails & {
  voucherTypeId: number;
  voucherDate: string;
  paymentMethodId: number | null;
  narration: string | null;
  lines: VoucherLineRequest[];
};

/** A supplier bill payment (Cash/Bank Payment Voucher) or a customer bill collection (Cash/Bank Receive Voucher). */
export type BillVoucherRequest = ChequeDetails & {
  voucherTypeId: number;
  voucherDate: string;
  /** The supplier paid, or the customer collected from. */
  partyId: number;
  /** The sub class their balance is kept on (Accounts Payable, Accounts Receivable, ...). */
  partyAccountId: number;
  /** The cash or bank sub class paid from (or deposited to). */
  cashAccountId: number;
  amount: number;
  paymentMethodId: number | null;
  narration: string | null;
};

export type VoucherListQuery = {
  search?: string;
  voucherTypeId?: number;
  status?: string;
  /** A supplier or customer named on any line. */
  partyId?: number;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

// ---- Reports

export type LedgerEntryRow = {
  voucherId: number;
  voucherRefNo: string;
  voucherType: string;
  voucherDate: string;
  chequeNo: string | null;
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
