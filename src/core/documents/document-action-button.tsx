"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/core/forms/action-state";
import { buttonClasses } from "@/core/ui/button";

/**
 * A document action (post, cancel, approve, delete) run as a Server Action after a confirmation.
 * The action redirects or refreshes on success; errors show under the button.
 */
export function DocumentActionButton({
  action,
  confirmMessage,
  variant = "outline",
  children,
}: {
  action: () => Promise<ActionState>;
  confirmMessage?: string;
  variant?: "primary" | "outline" | "danger" | "ghost";
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className={buttonClasses(variant, "sm")}
        onClick={() => {
          if (confirmMessage && !window.confirm(confirmMessage)) return;
          setError(undefined);
          startTransition(async () => {
            const result = await action();
            if (result?.status === "error") setError(result.message);
          });
        }}
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
      {error && <span className="max-w-72 text-right text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
