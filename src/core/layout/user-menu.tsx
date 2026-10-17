"use client";

import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/core/auth/actions";

export type UserMenuUser = {
  displayName: string;
  userName: string;
  email?: string;
  roles: string[];
};

function initials(name: string) {
  const parts = name.split(/[\s._@-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function UserMenu({ user }: { user: UserMenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.displayName}`}
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600 dark:bg-brand-500/20 dark:text-brand-300">
          {initials(user.displayName)}
        </span>
        <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{user.displayName}</span>
        <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-3 w-64 rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="border-b border-gray-100 px-2 pb-3 dark:border-gray-800">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-white/90">{user.displayName}</p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email ?? user.userName}</p>
            {user.roles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-white/5 dark:text-gray-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-2 flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <UserRound className="size-4" aria-hidden /> My profile
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <LogOut className="size-4" aria-hidden /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function UserMenuSkeleton() {
  return <div className="size-9 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" aria-hidden />;
}
