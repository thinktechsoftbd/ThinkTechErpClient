"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { cn } from "@/core/utils/cn";
import type { ActionState } from "./action-state";

/** Runs a Server Action after a browser confirmation (e.g. delete). */
export function ConfirmActionButton({
  action,
  confirmMessage,
  children,
  className,
}: {
  action: () => Promise<ActionState>;
  confirmMessage: string;
  children: ReactNode;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10",
          className,
        )}
        onClick={() => {
          if (!window.confirm(confirmMessage)) return;
          setError(undefined);
          startTransition(async () => {
            const result = await action();
            if (result.status === "error") setError(result.message);
          });
        }}
      >
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {children}
      </button>
      {error && <span className="max-w-60 text-right text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
