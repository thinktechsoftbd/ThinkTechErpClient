"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/core/utils/cn";

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

/**
 * Accessible modal built on the native <dialog>: focus is trapped, Escape and a click on the
 * backdrop close it, and the page behind is inert while it's open.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof sizes;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start in the first field rather than on the close button.
      bodyRef.current
        ?.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled])")
        ?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click whose target is the <dialog> itself landed on the backdrop, outside the panel.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] overflow-visible rounded-2xl border border-gray-200 bg-white p-0 text-left text-gray-800 shadow-theme-lg",
        "backdrop:bg-gray-900/50 backdrop:backdrop-blur-[2px] dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100",
        sizes[size],
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
              {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div ref={bodyRef} className="custom-scrollbar overflow-y-auto px-6 py-5">
            {children}
          </div>
        </div>
      )}
    </dialog>
  );
}
