"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { appConfig } from "@/core/config/app";
import { cn } from "@/core/utils/cn";
import { useSidebar } from "./sidebar-context";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-sm font-bold text-white",
        className,
      )}
    >
      {appConfig.shortName}
    </span>
  );
}

export function AppSidebar({ nav }: { nav: ReactNode }) {
  const { isExpanded, isMobileOpen } = useSidebar();
  const showLabels = isExpanded || isMobileOpen;

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-4 text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900",
        isExpanded ? "xl:w-[290px]" : "xl:w-[90px]",
        "w-[290px] xl:translate-x-0",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
      )}
      data-expanded={showLabels}
      aria-label="Main navigation"
    >
      <div className={cn("flex h-[72px] shrink-0 items-center", showLabels ? "justify-start" : "justify-center")}>
        <Link href={appConfig.homePath} className="flex items-center gap-3">
          <BrandMark />
          {showLabels && (
            <span className="text-lg font-semibold text-gray-800 dark:text-white/90">{appConfig.name}</span>
          )}
        </Link>
      </div>
      <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto pb-6">{nav}</div>
    </aside>
  );
}

export function SidebarBackdrop() {
  const { isMobileOpen, closeMobile } = useSidebar();
  if (!isMobileOpen) return null;
  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-[2px] xl:hidden"
      onClick={closeMobile}
      aria-hidden
    />
  );
}

export function AdminMain({ children }: { children: ReactNode }) {
  const { isExpanded } = useSidebar();
  return (
    <div
      className={cn(
        "flex min-h-screen min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out",
        isExpanded ? "xl:ml-[290px]" : "xl:ml-[90px]",
      )}
    >
      {children}
    </div>
  );
}
