"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/core/utils/cn";

/**
 * Writes text to the clipboard. The Clipboard API is missing on plain-HTTP origins (e.g. a LAN IP)
 * and can be denied by policy, so fall back to the older selection + execCommand("copy").
 */
async function copyText(text: string) {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy method.
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  // Inside a modal <dialog>, only the dialog's subtree is focusable.
  (document.activeElement?.closest("dialog") ?? document.body).appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}

/** Copies `value` to the clipboard and briefly confirms it. */
export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <button
      type="button"
      onClick={async () => setState((await copyText(value)) ? "copied" : "failed")}
      disabled={!value}
      title={state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : label}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/5",
        state === "copied" && "text-green-600 dark:text-green-400",
        state === "failed" && "text-red-600 dark:text-red-400",
        className,
      )}
    >
      {state === "copied" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {state === "copied" ? "Copied" : state === "failed" ? "Failed" : label}
    </button>
  );
}
