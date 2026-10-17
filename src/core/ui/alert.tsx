import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/core/utils/cn";

type Tone = "info" | "success" | "warning" | "error";

const styles: Record<Tone, string> = {
  info: "border-brand-200 bg-brand-25 text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200",
  success: "border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
};

const icons = { info: Info, success: CircleCheck, warning: TriangleAlert, error: TriangleAlert };

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const Icon = icons[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm", styles[tone], className)}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="break-words opacity-90">{children}</div>}
      </div>
    </div>
  );
}
