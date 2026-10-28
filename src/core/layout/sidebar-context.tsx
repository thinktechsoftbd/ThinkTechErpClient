"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

type SidebarState = {
  /** Desktop: full width (true) or icon rail (false). */
  isExpanded: boolean;
  /** Mobile: off-canvas drawer open. */
  isMobileOpen: boolean;
  toggleSidebar: () => void;
  toggleMobile: () => void;
  closeMobile: () => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isExpanded, setExpanded] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = useCallback(() => setExpanded((value) => !value), []);
  const toggleMobile = useCallback(() => setMobileOpen((value) => !value), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({ isExpanded, isMobileOpen, toggleSidebar, toggleMobile, closeMobile }),
    [isExpanded, isMobileOpen, toggleSidebar, toggleMobile, closeMobile],
  );

  return <SidebarContext value={value}>{children}</SidebarContext>;
}

export function useSidebar() {
  const context = use(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within SidebarProvider");
  return context;
}
