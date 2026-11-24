"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/core/utils/cn";
import { useFormState } from "./action-form";

export type FormTab = {
  key: string;
  label: string;
  /** The field names on this tab: a server error on one marks the tab (and opens it when the open tab has none). */
  fields: readonly string[];
  content: ReactNode;
};

/**
 * A long form split into tabs inside an <ActionForm>, so nothing needs scrolling. Every tab stays mounted (the
 * hidden ones too), so all fields are sent together. A required field left empty on a hidden tab opens that tab
 * first (the browser can't point at a hidden field), and a save that comes back with field errors opens the
 * first tab that has one.
 */
export function FormTabs({ tabs, label }: { tabs: FormTab[]; label: string }) {
  const { state } = useFormState();
  const [current, setCurrent] = useState(tabs[0]?.key ?? "");
  const rootRef = useRef<HTMLDivElement>(null);
  const idBase = useId();
  const tabId = (key: string) => `${idBase}-tab-${key}`;
  const panelId = (key: string) => `${idBase}-panel-${key}`;
  const hasErrors = (key: string) =>
    Boolean(state.fieldErrors && tabs.find((tab) => tab.key === key)?.fields.some((field) => state.fieldErrors?.[field]));

  // A save came back with field errors: if none is on the open tab, open the first tab that has one.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (!hasErrors(current)) {
      const withErrors = tabs.find((tab) => hasErrors(tab.key));
      if (withErrors) setCurrent(withErrors.key);
    }
  }

  // The browser's own check (e.g. a required field) can't point at a field on a hidden tab: open that tab first.
  // The capture listener runs before the browser looks for the field to focus.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onInvalid = (event: Event) => {
      const key = (event.target as HTMLElement).closest<HTMLElement>("[data-form-tab]")?.dataset.formTab;
      if (key) flushSync(() => setCurrent(key));
    };
    root.addEventListener("invalid", onInvalid, true);
    return () => root.removeEventListener("invalid", onInvalid, true);
  }, []);

  /** Arrow keys move between tabs (the tab list is one stop for Tab). */
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = tabs.findIndex((tab) => tab.key === current);
    const next = tabs[(index + step + tabs.length) % tabs.length].key;
    setCurrent(next);
    document.getElementById(tabId(next))?.focus();
  }

  return (
    <div ref={rootRef}>
      <div role="tablist" aria-label={label} className="no-scrollbar mb-4 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
        {tabs.map((tab) => {
          const selected = tab.key === current;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={selected}
              aria-controls={panelId(tab.key)}
              tabIndex={selected ? 0 : -1}
              onClick={() => setCurrent(tab.key)}
              onKeyDown={onKeyDown}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition",
                selected
                  ? "border-brand-500 text-brand-600 dark:text-brand-300"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {tab.label}
              {hasErrors(tab.key) && (
                <span className="size-1.5 rounded-full bg-red-500" title="Has errors">
                  <span className="sr-only">(has errors)</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          role="tabpanel"
          id={panelId(tab.key)}
          aria-labelledby={tabId(tab.key)}
          data-form-tab={tab.key}
          hidden={tab.key !== current}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
