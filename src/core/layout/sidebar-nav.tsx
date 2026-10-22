"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { ModuleDefinition, NavItem } from "@/core/modules/types";
import { cn } from "@/core/utils/cn";
import { modules } from "@/modules/registry";
import { useSidebar } from "./sidebar-context";

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function isInModule(pathname: string, module: ModuleDefinition) {
  return pathname === module.basePath || pathname.startsWith(`${module.basePath}/`);
}

// Shared with ApiSidebarNav (api-sidebar-nav.tsx).
export const itemBase =
  "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
export const itemIdle = "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5";
export const itemActive = "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400";
export const subItemBase = "block rounded-md px-3 py-1.5 text-sm transition-colors";
export const subItemIdle = "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white";
export const subItemActive = "font-medium text-brand-500 dark:text-brand-400";
export const subListClass = "mt-1 ml-9 space-y-0.5 border-l border-gray-100 pl-3 dark:border-gray-800";

export function menuIconClass(active: boolean) {
  return cn(
    "size-5 shrink-0",
    active ? "text-brand-500 dark:text-brand-400" : "text-gray-500 group-hover:text-gray-700 dark:text-gray-400",
  );
}

function MenuIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  return <Icon className={menuIconClass(active)} aria-hidden />;
}

export function SectionTitle({ children, showLabels }: { children: string; showLabels: boolean }) {
  return (
    <h2
      className={cn(
        "mb-3 flex text-xs leading-5 text-gray-400 uppercase",
        showLabels ? "justify-start" : "justify-center",
      )}
    >
      {showLabels ? children : "•••"}
    </h2>
  );
}

function ModuleMenu({
  module,
  pathname,
  showLabels,
}: {
  module: ModuleDefinition;
  pathname: string;
  showLabels: boolean;
}) {
  const { closeMobile } = useSidebar();
  const inModule = isInModule(pathname, module);
  const [openOverride, setOpenOverride] = useState<boolean>();
  const open = openOverride ?? inModule;
  const planned = module.status === "planned";

  if (!showLabels || module.nav.length === 1) {
    return (
      <Link
        href={module.basePath}
        title={module.name}
        onClick={closeMobile}
        className={cn(itemBase, inModule ? itemActive : itemIdle, !showLabels && "justify-center")}
      >
        <MenuIcon icon={module.icon} active={inModule} />
        {showLabels && <span className="flex-1">{module.name}</span>}
        {showLabels && planned && <SoonBadge />}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpenOverride(!open)}
        aria-expanded={open}
        className={cn(itemBase, inModule ? itemActive : itemIdle)}
      >
        <MenuIcon icon={module.icon} active={inModule} />
        <span className="flex-1 text-left">{module.name}</span>
        {planned && <SoonBadge />}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className={subListClass}>
          {module.nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMobile}
                  aria-current={active ? "page" : undefined}
                  className={cn(subItemBase, active ? subItemActive : subItemIdle)}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SoonBadge() {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 uppercase dark:bg-white/5 dark:text-gray-400">
      Soon
    </span>
  );
}

/** Sidebar menu built from the module registry, filtered to the modules the user may access. */
export function SidebarNav({ allowedModuleKeys }: { allowedModuleKeys: string[] }) {
  const pathname = usePathname();
  const { isExpanded, isMobileOpen, closeMobile } = useSidebar();
  const showLabels = isExpanded || isMobileOpen;
  const allowed = new Set(allowedModuleKeys);
  const visible = modules.filter((module) => allowed.has(module.key));
  const active = visible.filter((module) => module.status === "active");
  const planned = visible.filter((module) => module.status === "planned");
  const dashboardActive = pathname === "/dashboard";

  return (
    <nav className="space-y-6">
      <div>
        <SectionTitle showLabels={showLabels}>Menu</SectionTitle>
        <Link
          href="/dashboard"
          title="Dashboard"
          onClick={closeMobile}
          className={cn(itemBase, dashboardActive ? itemActive : itemIdle, !showLabels && "justify-center")}
        >
          <MenuIcon icon={LayoutDashboard} active={dashboardActive} />
          {showLabels && <span>Dashboard</span>}
        </Link>
      </div>
      {active.length > 0 && (
        <div>
          <SectionTitle showLabels={showLabels}>Modules</SectionTitle>
          <ul className="space-y-1">
            {active.map((module) => (
              <li key={module.key}>
                <ModuleMenu module={module} pathname={pathname} showLabels={showLabels} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {planned.length > 0 && (
        <div>
          <SectionTitle showLabels={showLabels}>Coming soon</SectionTitle>
          <ul className="space-y-1">
            {planned.map((module) => (
              <li key={module.key}>
                <ModuleMenu module={module} pathname={pathname} showLabels={showLabels} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

export function SidebarNavSkeleton() {
  return (
    <div className="space-y-3 pt-8" aria-hidden>
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
      ))}
    </div>
  );
}
