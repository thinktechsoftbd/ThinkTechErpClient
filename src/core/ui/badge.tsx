import type { ReactNode } from "react";
import { cn } from "@/core/utils/cn";

type Tone = "gray" | "brand" | "success" | "warning" | "error";

const tones: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  success: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  error: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? "success" : "gray"}>{active ? "Active" : "Inactive"}</Badge>;
}
