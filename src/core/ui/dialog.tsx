"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/core/utils/cn";

/**
 * Modal built on the native <dialog>: the browser provides the focus trap, Esc to close
 * and top-layer stacking. Children mount only while open, so forms start fresh each time.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("input:not([type=hidden]):not(:disabled), select, textarea")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-full max-w-[min(32rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 text-left text-sm font-normal text-gray-800 shadow-xl backdrop:bg-gray-900/50 backdrop:backdrop-blur-[2px] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90",
        className,
      )}
    >
      {open && (
        <>
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-semibold text-gray-800 dark:text-white/90">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="p-5 sm:p-6">{children}</div>
        </>
      )}
    </dialog>
  );
}
