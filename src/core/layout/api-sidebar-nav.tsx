"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Circle } from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import { useState } from "react";
import { cn } from "@/core/utils/cn";
import { useSidebar } from "./sidebar-context";
import {
  SectionTitle,
  itemActive,
  itemBase,
  itemIdle,
  menuIconClass,
  subItemActive,
  subItemBase,
  subItemIdle,
  subListClass,
} from "./sidebar-nav";
import type { MenuNode } from "./user-menus";

const knownIcons = new Set<string>(iconNames);

/** Accepts "layout-dashboard" as well as "LayoutDashboard" from the menu table. */
function iconName(icon: string | null | undefined): IconName | undefined {
  const name = icon?.trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return name && knownIcons.has(name) ? (name as IconName) : undefined;
}

function NodeIcon({ icon, active }: { icon?: string | null; active: boolean }) {
  const className = menuIconClass(active);
  const name = iconName(icon);
  if (!name) return <Circle className={className} aria-hidden />;
  // Icons load on demand; keep their space while they do.
  return (
    <DynamicIcon
      name={name}
      className={className}
      aria-hidden
      fallback={() => <span className="inline-block size-5 shrink-0" aria-hidden />}
    />
  );
}

/** Menus with a route; "#" (or anything not starting with "/") is a group without a page. */
function hasRoute(menu: MenuNode) {
  return menu.path.startsWith("/");
}

function pathMatches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path.replace(/\/+$/, "")}/`);
}

/** The single menu path to highlight: the longest one that contains the current page. */
function findActivePath(menus: MenuNode[], pathname: string): string | undefined {
  let best: string | undefined;
  const visit = (menu: MenuNode) => {
    if (hasRoute(menu) && pathMatches(pathname, menu.path) && menu.path.length > (best?.length ?? -1)) best = menu.path;
    menu.children.forEach(visit);
  };
  menus.forEach(visit);
  return best;
}

function containsPath(menu: MenuNode, path: string | undefined): boolean {
  if (!path) return false;
  return (hasRoute(menu) && menu.path === path) || menu.children.some((child) => containsPath(child, path));
}

function firstRoute(menu: MenuNode): string | undefined {
  if (hasRoute(menu)) return menu.path;
  for (const child of menu.children) {
    const route = firstRoute(child);
    if (route) return route;
  }
  return undefined;
}

type EntryProps = { menu: MenuNode; activePath: string | undefined; showLabels: boolean };

function TopLevelEntry({ menu, activePath, showLabels }: EntryProps) {
  const { closeMobile } = useSidebar();
  const active = containsPath(menu, activePath);
  const [openOverride, setOpenOverride] = useState<boolean>();
  const open = openOverride ?? active;

  // Collapsed sidebar, or a plain menu item: one icon link (a group opens its first page).
  if (!showLabels || menu.children.length === 0) {
    const href = firstRoute(menu);
    const content = (
      <>
        <NodeIcon icon={menu.icon} active={active} />
        {showLabels && <span className="flex-1">{menu.title}</span>}
      </>
    );
    const className = cn(itemBase, active ? itemActive : itemIdle, !showLabels && "justify-center");
    return href ? (
      <Link
        href={href}
        title={menu.title}
        onClick={closeMobile}
        aria-current={activePath === menu.path ? "page" : undefined}
        className={className}
      >
        {content}
      </Link>
    ) : (
      <span title={menu.title} className={cn(className, "cursor-default opacity-60")}>
        {content}
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpenOverride(!open)}
        aria-expanded={open}
        className={cn(itemBase, active ? itemActive : itemIdle)}
      >
        <NodeIcon icon={menu.icon} active={active} />
        <span className="flex-1 text-left">{menu.title}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <SubMenuList menus={menu.children} activePath={activePath} />}
    </div>
  );
}

function SubMenuList({ menus, activePath }: { menus: MenuNode[]; activePath: string | undefined }) {
  return (
    <ul className={subListClass}>
      {menus.map((menu) => (
        <li key={menu.id}>
          <SubMenuEntry menu={menu} activePath={activePath} />
        </li>
      ))}
    </ul>
  );
}

function SubMenuEntry({ menu, activePath }: { menu: MenuNode; activePath: string | undefined }) {
  const { closeMobile } = useSidebar();
  const active = containsPath(menu, activePath);
  const [openOverride, setOpenOverride] = useState<boolean>();
  const open = openOverride ?? active;

  if (menu.children.length > 0) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpenOverride(!open)}
          aria-expanded={open}
          className={cn(subItemBase, "flex w-full items-center gap-2 text-left", active ? subItemActive : subItemIdle)}
        >
          <span className="flex-1">{menu.title}</span>
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open && <SubMenuList menus={menu.children} activePath={activePath} />}
      </div>
    );
  }

  if (!hasRoute(menu)) {
    return <span className={cn(subItemBase, subItemIdle, "cursor-default opacity-60")}>{menu.title}</span>;
  }

  const current = activePath === menu.path;
  return (
    <Link
      href={menu.path}
      onClick={closeMobile}
      aria-current={current ? "page" : undefined}
      className={cn(subItemBase, current ? subItemActive : subItemIdle)}
    >
      {menu.title}
    </Link>
  );
}

/** Sidebar menu from ThinkTechErpAPI: the signed-in user's menu tree, as the API filtered it. */
export function ApiSidebarNav({ menus }: { menus: MenuNode[] }) {
  const pathname = usePathname();
  const { isExpanded, isMobileOpen } = useSidebar();
  const showLabels = isExpanded || isMobileOpen;
  const activePath = findActivePath(menus, pathname);

  return (
    <nav>
      <SectionTitle showLabels={showLabels}>Menu</SectionTitle>
      {menus.length === 0 ? (
        showLabels && <p className="px-3 text-sm text-gray-500 dark:text-gray-400">No menus are assigned to your account.</p>
      ) : (
        <ul className="space-y-1">
          {menus.map((menu) => (
            <li key={menu.id}>
              <TopLevelEntry menu={menu} activePath={activePath} showLabels={showLabels} />
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
