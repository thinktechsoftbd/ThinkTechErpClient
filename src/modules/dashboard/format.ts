// Number and date wording for the dashboard; works on the server and in the browser.

const takaFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 1285000 -> "৳ 12,85,000" (whole taka, lakh grouping). */
export function formatTaka(value: number) {
  return `৳ ${takaFormat.format(Math.round(value))}`;
}

/** Short amounts for axes and tight spots: 950 -> "950", 12900 -> "12.9K", 1285000 -> "12.9L", 32000000 -> "3.2Cr". */
export function compactTaka(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const short = (n: number, unit: string) => `${sign}${Number(n.toFixed(n < 10 ? 1 : 0))}${unit}`;
  if (abs >= 1e7) return short(abs / 1e7, "Cr");
  if (abs >= 1e5) return short(abs / 1e5, "L");
  if (abs >= 1e3) return short(abs / 1e3, "K");
  return `${sign}${Math.round(abs)}`;
}

/** The change from `previous` to `current` in percent, or null when there was nothing before. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/** "2026-11-05" -> "Nov 05"; with the year: "Nov 05, 2026". */
export function shortDate(iso: string, withYear = false) {
  const [year, month, day] = iso.split("-");
  const text = `${MONTHS[Number(month) - 1]} ${day}`;
  return withYear ? `${text}, ${year}` : text;
}

/** "2026-11-01" -> "Nov" (month points). */
export function monthName(iso: string) {
  return MONTHS[Number(iso.slice(5, 7)) - 1];
}

/** Days from one YYYY-MM-DD to another. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** YYYY-MM-DD plus whole days. */
export function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
