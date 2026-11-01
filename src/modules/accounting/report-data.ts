import type { AccountBalanceRow } from "./types";

// Rolls ledger-head balances up the chart for the trial balance and balance sheet.

/** A level of the chart a report can be summarised at: 1 Parent Class … 5 Sub Class. */
export type ReportLevel = 1 | 2 | 3 | 4 | 5;

export type RolledUp = {
  id: number;
  code: string;
  name: string;
  /** The parent class and account class the account sits under. */
  parentClassId: number;
  accountClassId: number;
  openingBalance: number;
  periodDebit: number;
  periodCredit: number;
  closingBalance: number;
};

function at(row: AccountBalanceRow, level: ReportLevel) {
  switch (level) {
    case 1:
      return { id: row.parentClassId, code: row.parentClassCode, name: row.parentClassName };
    case 2:
      return { id: row.accountClassId, code: row.accountClassCode, name: row.accountClassName };
    case 3:
      return { id: row.mainClassId, code: row.mainClassCode, name: row.mainClassName };
    case 4:
      return { id: row.mapClassId, code: row.mapClassCode, name: row.mapClassName };
    default:
      return { id: row.accountId, code: row.code, name: row.name };
  }
}

/** The rows summed per account at `level`, in chart order (the API sorts the rows by the chart). */
export function rollUp(rows: AccountBalanceRow[], level: ReportLevel): RolledUp[] {
  const byId = new Map<number, RolledUp>();
  for (const row of rows) {
    const account = at(row, level);
    const current = byId.get(account.id) ?? {
      ...account,
      parentClassId: row.parentClassId,
      accountClassId: row.accountClassId,
      openingBalance: 0,
      periodDebit: 0,
      periodCredit: 0,
      closingBalance: 0,
    };
    current.openingBalance += row.openingBalance;
    current.periodDebit += row.periodDebit;
    current.periodCredit += row.periodCredit;
    current.closingBalance += row.closingBalance;
    byId.set(account.id, current);
  }
  return [...byId.values()];
}

/** Groups in first-seen order: the sections of a report. */
export function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const groups = new Map<K, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return [...groups.entries()];
}

/** A debit-minus-credit balance split into its debit and credit columns. */
export function split(balance: number) {
  return { debit: Math.max(balance, 0), credit: Math.max(-balance, 0) };
}

export function sum<T>(items: T[], value: (item: T) => number) {
  return items.reduce((total, item) => total + value(item), 0);
}

export function parseLevel(value: string | undefined, allowed: readonly ReportLevel[], fallback: ReportLevel): ReportLevel {
  const level = Number(value) as ReportLevel;
  return allowed.includes(level) ? level : fallback;
}
