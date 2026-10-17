"use client";

import { Braces, LoaderCircle, Rows3 } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { idleState, type FormAction } from "@/core/forms/action-state";
import { Input, Label, Select, Textarea } from "@/core/forms/fields";
import { Alert } from "@/core/ui/alert";
import { Button, LinkButton, buttonClasses } from "@/core/ui/button";
import { columnLabel, isIsoDate, isLongTextKey, SYSTEM_FIELDS } from "../records";
import type { WebsiteRecord } from "../types";

type Kind = "text" | "textarea" | "number" | "boolean" | "json";

type FieldState = {
  key: string;
  kind: Kind;
  value: string | boolean;
  /** Type unknown (value was null): coerce numbers/booleans from text on save. */
  untyped: boolean;
};

function inferKind(key: string, value: unknown): Pick<FieldState, "kind" | "untyped"> {
  if (typeof value === "boolean") return { kind: "boolean", untyped: false };
  if (typeof value === "number") return { kind: "number", untyped: false };
  if (value !== null && typeof value === "object") return { kind: "json", untyped: false };
  if (typeof value === "string") {
    const long = isLongTextKey(key) || value.length > 120 || value.includes("\n");
    return { kind: long ? "textarea" : "text", untyped: false };
  }
  if (/^(is|has)_/.test(key)) return { kind: "boolean", untyped: false };
  return { kind: isLongTextKey(key) ? "textarea" : "text", untyped: true };
}

function displayValue(kind: Kind, value: unknown): string | boolean {
  if (kind === "boolean") return value === true;
  if (value === null || value === undefined) return "";
  if (kind === "json") return JSON.stringify(value, null, 2);
  return String(value);
}

/** Create mode: booleans start as "" (database default) and render as a Default/Yes/No select. */
function toFields(record: WebsiteRecord, keys: string[], empty: boolean): FieldState[] {
  return keys.map((key) => {
    const { kind, untyped } = inferKind(key, record[key]);
    const value = !empty ? displayValue(kind, record[key]) : kind === "boolean" ? "" : displayValue(kind, null);
    return { key, kind, untyped, value };
  });
}

function coerceUntyped(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === "true" || trimmed === "false") return trimmed === "true";
  return text;
}

function convert(field: FieldState, original: unknown): { value: unknown } | { error: string } {
  const { kind, value } = field;
  if (kind === "boolean") {
    if (typeof value === "string") return { value: value === "" ? null : value === "true" };
    return { value: value === true };
  }
  const text = String(value);
  if (kind === "number") {
    if (text.trim() === "") return { value: null };
    const number = Number(text);
    return Number.isFinite(number) ? { value: number } : { error: `${columnLabel(field.key)} must be a number.` };
  }
  if (kind === "json") {
    if (text.trim() === "") return { value: null };
    try {
      return { value: JSON.parse(text) };
    } catch {
      return { error: `${columnLabel(field.key)} is not valid JSON.` };
    }
  }
  if (field.untyped) return { value: coerceUntyped(text) };
  return { value: text === "" && original === null ? null : text };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Schema-less record editor for the website tables. Field types are inferred
 * from existing values; only changed fields are sent on update.
 */
export function RecordForm({
  action,
  mode,
  record,
  idKey,
  cancelHref,
}: {
  action: FormAction;
  mode: "create" | "edit";
  /** Edit: the record. Create: a sample row used as a field template (or {}). */
  record: WebsiteRecord;
  idKey?: string;
  cancelHref: string;
}) {
  const editableKeys = Object.keys(record).filter((key) =>
    mode === "edit" ? key !== idKey : !SYSTEM_FIELDS.includes(key) && key !== idKey,
  );

  const [originals, setOriginals] = useState<WebsiteRecord>(() => (mode === "edit" ? record : {}));
  const [fields, setFields] = useState(() => toFields(record, editableKeys, mode === "create"));
  const [jsonMode, setJsonMode] = useState(editableKeys.length === 0);
  const [jsonText, setJsonText] = useState("{\n  \n}");
  const [clientError, setClientError] = useState<string>();
  const [state, formAction, pending] = useActionState(action, idleState);
  const lastPayload = useRef<WebsiteRecord>({});

  useEffect(() => {
    // After a successful update the saved values become the new baseline.
    if (state.status === "success") setOriginals((current) => ({ ...current, ...lastPayload.current }));
  }, [state]);

  function fieldsToObject(): WebsiteRecord | string {
    const result: WebsiteRecord = {};
    for (const field of fields) {
      const converted = convert(field, originals[field.key]);
      if ("error" in converted) return converted.error;
      result[field.key] = converted.value;
    }
    return result;
  }

  function buildPayload(): WebsiteRecord | string {
    let values: WebsiteRecord;
    if (jsonMode) {
      try {
        const parsed: unknown = JSON.parse(jsonText);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "The record must be a JSON object.";
        values = parsed as WebsiteRecord;
      } catch {
        return "The JSON is not valid.";
      }
    } else {
      const converted = fieldsToObject();
      if (typeof converted === "string") return converted;
      values = converted;
    }

    const payload: WebsiteRecord = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === idKey) continue;
      if (mode === "edit") {
        if (!same(value, originals[key])) payload[key] = value;
      } else if (value !== null && value !== undefined && value !== "") {
        payload[key] = value;
      }
    }
    return payload;
  }

  function switchToJson() {
    const values = fieldsToObject();
    if (typeof values === "string") return setClientError(values);
    const shown = mode === "create"
      ? Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null && value !== ""))
      : values;
    setJsonText(JSON.stringify(shown, null, 2));
    setClientError(undefined);
    setJsonMode(true);
  }

  function switchToFields() {
    try {
      const parsed = JSON.parse(jsonText) as WebsiteRecord;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      const keys = [...new Set([...fields.map((field) => field.key), ...Object.keys(parsed)])].filter((key) => key !== idKey);
      setFields(
        keys.map((key) => {
          const existing = fields.find((field) => field.key === key);
          const kind = existing?.kind ?? inferKind(key, parsed[key]).kind;
          const untyped = existing?.untyped ?? inferKind(key, parsed[key]).untyped;
          const triState = kind === "boolean" && typeof existing?.value === "string";
          const parsedValue = triState ? (parsed[key] == null ? "" : String(parsed[key] === true)) : displayValue(kind, parsed[key]);
          const value = key in parsed ? parsedValue : (existing?.value ?? "");
          return { key, kind, untyped, value };
        }),
      );
      setClientError(undefined);
      setJsonMode(false);
    } catch {
      setClientError("Fix the JSON before switching back to fields.");
    }
  }

  function update(key: string, value: string | boolean) {
    setFields((current) => current.map((field) => (field.key === key ? { ...field, value } : field)));
  }

  const message = clientError ?? (state.status !== "idle" ? state.message : undefined);
  const tone = clientError || state.status === "error" ? "error" : "success";

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const payload = buildPayload();
        if (typeof payload === "string") return setClientError(payload);
        if (Object.keys(payload).length === 0) {
          return setClientError(mode === "edit" ? "No changes to save." : "Fill in at least one field.");
        }
        setClientError(undefined);
        lastPayload.current = payload;
        const formData = new FormData();
        formData.set("payload", JSON.stringify(payload));
        startTransition(() => formAction(formData));
      }}
    >
      {message && <Alert tone={tone}>{message}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {mode === "edit"
            ? "Only fields you change are sent to the API."
            : "Empty fields are left out so database defaults apply."}
        </p>
        {editableKeys.length > 0 && (
          <Button variant="outline" size="sm" onClick={jsonMode ? switchToFields : switchToJson}>
            {jsonMode ? <Rows3 className="size-4" aria-hidden /> : <Braces className="size-4" aria-hidden />}
            {jsonMode ? "Edit as fields" : "Edit as JSON"}
          </Button>
        )}
      </div>

      {jsonMode ? (
        <div>
          <Label htmlFor="record-json">Record JSON</Label>
          <Textarea
            id="record-json"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            rows={16}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Use the table&apos;s column names (snake_case). Identity and generated columns are rejected by the API.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {fields.map((field) => {
            const id = `field-${field.key}`;
            const label = columnLabel(field.key);
            if (field.kind === "boolean" && typeof field.value === "string") {
              return (
                <div key={field.key}>
                  <Label htmlFor={id}>{label}</Label>
                  <Select id={id} value={field.value} onChange={(event) => update(field.key, event.target.value)}>
                    <option value="">Database default</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                </div>
              );
            }
            if (field.kind === "boolean") {
              return (
                <label key={field.key} className="flex items-center gap-2.5 self-end pb-3 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={field.value === true}
                    onChange={(event) => update(field.key, event.target.checked)}
                    className="size-4 rounded border-gray-300 accent-brand-500"
                  />
                  {label}
                </label>
              );
            }
            const wide = field.kind === "textarea" || field.kind === "json";
            const original = originals[field.key];
            return (
              <div key={field.key} className={wide ? "md:col-span-2" : undefined}>
                <Label htmlFor={id}>{label}</Label>
                {wide ? (
                  <Textarea
                    id={id}
                    value={String(field.value)}
                    onChange={(event) => update(field.key, event.target.value)}
                    rows={field.kind === "json" ? 6 : 4}
                    className={field.kind === "json" ? "font-mono text-xs" : undefined}
                  />
                ) : (
                  <Input
                    id={id}
                    value={String(field.value)}
                    inputMode={field.kind === "number" ? "decimal" : undefined}
                    onChange={(event) => update(field.key, event.target.value)}
                  />
                )}
                {isIsoDate(original) && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">ISO 8601, e.g. 2026-10-17T09:00:00Z</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className={buttonClasses("primary")}>
          {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Create"}
        </button>
        <LinkButton href={cancelHref} variant="outline">
          {mode === "edit" ? "Back" : "Cancel"}
        </LinkButton>
      </div>
    </form>
  );
}
