// Number helpers that work on the server and in the browser (format.ts is server-only).

const amountFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

/** 1234.5 -> "1,234.50"; null -> "—". */
export function formatAmount(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : amountFormat.format(value);
}

/** 2.5 -> "2.5", 1000 -> "1,000"; null -> "—". */
export function formatQuantity(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "—" : quantityFormat.format(value);
}

/** Parses "1,234.50" or "12"; empty or invalid gives null. */
export function parseDecimal(value: string | null | undefined) {
  const text = (value ?? "").replace(/,/g, "").trim();
  if (!text || !/^-?\d*\.?\d+$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

export function round(value: number, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Today's date as YYYY-MM-DD in the browser's (or server's) time zone. */
export function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
