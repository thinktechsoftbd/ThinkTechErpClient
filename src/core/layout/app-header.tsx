"use client";

import { Menu, PanelLeft, X } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/core/theme/theme-toggle";
import { BrandMark } from "./app-sidebar";
import { useSidebar } from "./sidebar-context";

export function AppHeader({ userMenu }: { userMenu: ReactNode }) {
  const { toggleSidebar, toggleMobile, isMobileOpen } = useSidebar();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center gap-3 border-b border-gray-200 bg-white/95 px-4 backdrop-blur md:px-6 dark:border-gray-800 dark:bg-gray-900/95">
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label="Collapse or expand sidebar"
        className="hidden size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 xl:flex dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
      >
        <PanelLeft className="size-5" />
      </button>
      <button
        type="button"
        onClick={toggleMobile}
        aria-label={isMobileOpen ? "Close menu" : "Open menu"}
        className="flex size-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 xl:hidden dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5"
      >
        {isMobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      <BrandMark className="xl:hidden" />
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        {userMenu}
      </div>
    </header>
  );
}
