import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/core/utils/cn";
import { FieldError } from "./action-form";

const controlClasses =
  "w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 dark:disabled:bg-gray-800";

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
      {children}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, "h-11", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(controlClasses, "py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, "h-11 pr-10", className)} {...props} />;
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300", className)}>
      <input
        type="checkbox"
        className="size-4 rounded border-gray-300 accent-brand-500 dark:border-gray-700"
        {...props}
      />
      {label}
    </label>
  );
}

/** Label + control + hint + server-side field error, wired by `name`. */
export function Field({
  label,
  name,
  hint,
  required,
  children,
  className,
}: {
  label: ReactNode;
  name: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      <FieldError name={name} />
    </div>
  );
}
