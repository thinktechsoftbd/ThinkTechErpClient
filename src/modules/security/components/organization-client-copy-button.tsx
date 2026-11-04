"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function OrganizationClientCopyButton({ value, label }: { value: string | null; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      disabled={!value}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
    >
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
