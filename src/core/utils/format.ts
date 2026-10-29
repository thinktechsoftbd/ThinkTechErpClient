import "server-only";
import { serverEnv } from "@/core/config/server-env";

const numberFormat = new Intl.NumberFormat("en-US");

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : numberFormat.format(value);
}

export function formatMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount === null || amount === undefined) return "—";
  if (!currency) return numberFormat.format(amount);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${numberFormat.format(amount)} ${currency}`;
  }
}

/** Formats an ISO timestamp on the server using APP_TIME_ZONE (or the server's zone). */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: serverEnv.timeZone,
  }).format(date);
}

/** Formats a calendar date ("2026-10-29", e.g. a C# DateOnly) without shifting it across time zones. */
export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
