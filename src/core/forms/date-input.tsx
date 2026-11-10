"use client";

import { CalendarDays } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type ComponentProps, type KeyboardEvent } from "react";
import { cn } from "@/core/utils/cn";
import { dmyToIso, isoToDmy, maskDmy } from "@/core/utils/date";

type DateInputProps = Omit<ComponentProps<"input">, "type"> & { controlClassName: string };

const text = (value: unknown) => (value === undefined || value === null ? "" : String(value));

/**
 * A date box that always shows and takes day/month/year ("29/10/2026"), whatever the browser's region: a
 * native date input shows the region's order (month first in the US). It works like `<input type="date">`
 * for its callers: `value`, `defaultValue`, `min` and `max` are "YYYY-MM-DD", `onChange` gets an event whose
 * `target.value` is "YYYY-MM-DD" ("" while the date is incomplete), and a form submits `name` as
 * "YYYY-MM-DD". The calendar button (or Alt+↓) opens the browser's date picker.
 */
export function DateInput({
  controlClassName,
  className,
  value,
  defaultValue,
  onChange,
  onKeyDown,
  name,
  min,
  max,
  disabled,
  readOnly,
  placeholder = "dd/mm/yyyy",
  ...rest
}: DateInputProps) {
  const controlled = value !== undefined;
  const nativeRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const [ownValue, setOwnValue] = useState(() => text(controlled ? value : defaultValue));
  const current = controlled ? text(value) : ownValue;
  const [typed, setTyped] = useState(() => isoToDmy(current));

  // A new value from outside (a reset, a calculated date) replaces what is typed, unless that already means it.
  const [seen, setSeen] = useState(current);
  if (current !== seen) {
    setSeen(current);
    if (dmyToIso(typed) !== current) setTyped(isoToDmy(current));
  }

  const minIso = text(min);
  const maxIso = text(max);
  const typedIso = dmyToIso(typed);
  const problem =
    typed && !typedIso
      ? "Enter the date as dd/mm/yyyy, e.g. 29/10/2026."
      : typedIso && minIso && typedIso < minIso
        ? `Enter ${isoToDmy(minIso)} or later.`
        : typedIso && maxIso && typedIso > maxIso
          ? `Enter ${isoToDmy(maxIso)} or earlier.`
          : "";
  // The form won't submit while the typed date is incomplete or out of range.
  useEffect(() => {
    textRef.current?.setCustomValidity(problem);
  }, [problem]);

  /** Hands the caller a change event of the hidden date input, whose value is the new YYYY-MM-DD. */
  function emit(nextIso: string) {
    if (!controlled) setOwnValue(nextIso);
    const native = nativeRef.current;
    if (!native || !onChange) return;
    native.value = nextIso;
    onChange({ target: native, currentTarget: native, type: "change" } as unknown as ChangeEvent<HTMLInputElement>);
  }

  function handleTyping(event: ChangeEvent<HTMLInputElement>) {
    const next = maskDmy(event.target.value);
    setTyped(next);
    const nextIso = dmyToIso(next);
    if (nextIso !== current) emit(nextIso);
  }

  function handlePick(event: ChangeEvent<HTMLInputElement>) {
    setTyped(isoToDmy(event.target.value));
    if (!controlled) setOwnValue(event.target.value);
    onChange?.(event);
  }

  function openPicker() {
    try {
      nativeRef.current?.showPicker();
    } catch {
      textRef.current?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();
      openPicker();
    }
    onKeyDown?.(event);
  }

  const locked = disabled || readOnly;
  return (
    <div className="relative w-full">
      <input
        {...rest}
        ref={textRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder={placeholder}
        value={typed}
        onChange={handleTyping}
        onKeyDown={handleKeyDown}
        // A finished date is shown padded: "1/2/2026" → "01/02/2026".
        onBlur={(event) => {
          if (typedIso) setTyped(isoToDmy(typedIso));
          rest.onBlur?.(event);
        }}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(controlClassName, "pr-9 tabular-nums", className)}
      />
      {/* Holds the YYYY-MM-DD value for the form and the browser's picker; the picker opens below the box. */}
      <input
        ref={nativeRef}
        type="date"
        name={name}
        value={current}
        min={minIso || undefined}
        max={maxIso || undefined}
        onChange={handlePick}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        disabled={locked}
        aria-label="Open calendar"
        title="Open calendar"
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-gray-400 hover:text-brand-500 disabled:cursor-not-allowed disabled:hover:text-gray-400 dark:text-gray-500"
      >
        <CalendarDays className="size-4" aria-hidden />
      </button>
    </div>
  );
}
