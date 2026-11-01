"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useFormState } from "@/core/forms/action-form";
import { buttonClasses } from "@/core/ui/button";

export type SubmitIntentValue = "save" | "post";

/**
 * The intent of the last submit of a document form (save a draft, or post it too), so the
 * clicked button shows the progress. The intent itself is sent by the button (name="intent").
 */
export function useSubmitIntent() {
  const [chosen, setChosen] = useState<SubmitIntentValue>("save");
  return { chosen, choose: setChosen };
}

/**
 * A full-width submit button for one intent, sent as the form's "intent" field. `confirmMessage`
 * asks first (Cancel keeps the form); the button that was clicked shows the progress.
 */
export function IntentSubmit({
  intent = "save",
  chosen,
  onChoose,
  variant,
  pendingLabel,
  confirmMessage,
  children,
}: {
  intent?: SubmitIntentValue;
  /** The intent of the last submit; omitted for a form with one submit button. */
  chosen?: SubmitIntentValue;
  onChoose?: (intent: SubmitIntentValue) => void;
  variant: "primary" | "outline" | "danger";
  pendingLabel: string;
  confirmMessage?: string;
  children: ReactNode;
}) {
  const { pending } = useFormState();
  const active = pending && (chosen === undefined || chosen === intent);
  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className={buttonClasses(variant, "md", "w-full")}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }
        onChoose?.(intent);
      }}
    >
      {active && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {active ? pendingLabel : children}
    </button>
  );
}

/**
 * GETs a JSON array from a browser-side lookup route (/api/lookup/...); null skips the request.
 * Failures give an empty list.
 */
export function useLookupList<T>(url: string | null) {
  const [loaded, setLoaded] = useState<{ url: string; items: T[] }>({ url: "", items: [] });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (!cancelled) setLoaded({ url, items: Array.isArray(data) ? (data as T[]) : [] });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ url, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const ready = Boolean(url) && loaded.url === url;
  return { items: ready ? loaded.items : [], loading: Boolean(url) && !ready };
}
