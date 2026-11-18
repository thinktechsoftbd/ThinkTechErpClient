"use client";

import { CalendarDays, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/core/utils/cn";
import { DASHBOARD_PERIODS } from "../types";

/** The dashboard's period (?period=) and a refresh button that reloads its figures. */
export function PeriodPicker() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = DASHBOARD_PERIODS.some((p) => p.value === params.get("period")) ? params.get("period")! : DASHBOARD_PERIODS[0].value;

  return (
    <div className="flex items-center gap-2">
      <label className="relative">
        <span className="sr-only">Period</span>
        <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <select
          value={current}
          onChange={(event) =>
            startTransition(() =>
              router.push(event.target.value === DASHBOARD_PERIODS[0].value ? pathname : `${pathname}?period=${event.target.value}`),
            )
          }
          className="h-10 rounded-lg border border-gray-300 bg-white pl-9 text-sm text-gray-700 shadow-theme-xs focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          {DASHBOARD_PERIODS.map((period) => (
            <option key={period.value} value={period.value}>
              {period.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        disabled={pending}
        aria-label="Refresh"
        title="Refresh"
        className="flex size-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-theme-xs hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <RefreshCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
      </button>
    </div>
  );
}
