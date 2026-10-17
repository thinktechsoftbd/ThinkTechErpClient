import type { WebsiteTableDefinition } from "./tables";
import type { WebsiteRecord } from "./types";

/** Columns the database manages; excluded from new-record templates. */
export const SYSTEM_FIELDS = ["id", "created_at", "updated_at"];

const LONG_TEXT_KEY = /(^|_)(content|body|description|answer|message|summary|excerpt|bio|cover_letter|text|quote|details|notes?)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/** The record's primary key value. The API resolves the real key; `id` is the convention. */
export function recordIdKey(record: WebsiteRecord) {
  if ("id" in record) return "id";
  return Object.keys(record).find((key) => key.endsWith("_id")) ?? Object.keys(record)[0];
}

export function recordId(record: WebsiteRecord) {
  const key = recordIdKey(record);
  const value = key ? record[key] : undefined;
  return value === undefined || value === null ? undefined : String(value);
}

/** Picks list columns: configured preferences first, then other short scalar fields. */
export function pickColumns(definition: WebsiteTableDefinition, records: WebsiteRecord[], max = 5) {
  const available = new Set<string>();
  for (const record of records.slice(0, 25)) Object.keys(record).forEach((key) => available.add(key));

  const columns = definition.listColumns.filter((column) => available.has(column));
  const unique = [...new Set(columns)];
  for (const key of available) {
    if (unique.length >= max) break;
    if (unique.includes(key) || SYSTEM_FIELDS.includes(key) || LONG_TEXT_KEY.test(key)) continue;
    const sample = records.find((record) => record[key] !== null && record[key] !== undefined)?.[key];
    if (sample === undefined || typeof sample === "object") continue;
    unique.push(key);
  }
  return unique.slice(0, max);
}

/** Human label for a snake_case column. */
export function columnLabel(key: string) {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value);
}

export function isLongTextKey(key: string) {
  return LONG_TEXT_KEY.test(key);
}

export function matchesSearch(record: WebsiteRecord, search: string) {
  return JSON.stringify(record).toLowerCase().includes(search.toLowerCase());
}

/** Best label for a record in headings. */
export function recordTitle(record: WebsiteRecord, fallback: string) {
  for (const key of ["title", "name", "full_name", "question", "label", "email", "slug"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}
