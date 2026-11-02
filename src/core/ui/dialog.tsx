"use client";

import { X } from "lucide-react";
import { useEffectEvent, useId, useLayoutEffect, useRef, type ReactNode } from "react";
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
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** md for short forms; xl for document editors with line tables. */
  size?: "md" | "xl";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const notifyClose = useEffectEvent(() => onClose());

  // A layout effect, so it also runs when Next.js keeps a route hidden (React <Activity>) instead of
  // unmounting it: the cleanup closes the dialog before it is hidden, and showing the route again
  // opens it as a modal again. Left open, the dialog can come back as a plain, non-modal box in the
  // page: moving an open dialog's node (as React does when reordering kept routes) drops its modal state.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (dialog.open && !dialog.matches(":modal")) dialog.close();
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>("input:not([type=hidden]):not(:disabled), select, textarea")?.focus();

    // Esc (or the browser) closed it: tell the owner. Closing it from the cleanup below is not reported,
    // nor is the close just above (the dialog is open again by the time that event arrives).
    const closedByUser = () => {
      if (!dialog.open) notifyClose();
    };
    dialog.addEventListener("close", closedByUser);
    return () => {
      dialog.removeEventListener("close", closedByUser);
      if (dialog.open) dialog.close();
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white p-0 text-left text-sm font-normal text-gray-800 shadow-xl backdrop:bg-gray-900/50 backdrop:backdrop-blur-[2px] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90",
        size === "xl" ? "max-w-[min(80rem,calc(100%-2rem))]" : "max-w-[min(32rem,calc(100%-2rem))]",
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
