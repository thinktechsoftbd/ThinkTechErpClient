import { Suspense, type ReactNode } from "react";
import { AdminMain, AppSidebar, SidebarBackdrop } from "@/core/layout/app-sidebar";
import { AppHeader } from "@/core/layout/app-header";
import { SessionSidebarNav, SessionUserMenu } from "@/core/layout/session-parts";
import { SidebarNavSkeleton } from "@/core/layout/sidebar-nav";
import { SidebarProvider } from "@/core/layout/sidebar-context";
import { UserMenuSkeleton } from "@/core/layout/user-menu";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen xl:flex">
        <AppSidebar
          nav={
            <Suspense fallback={<SidebarNavSkeleton />}>
              <SessionSidebarNav />
            </Suspense>
          }
        />
        <SidebarBackdrop />
        <AdminMain>
          <AppHeader
            userMenu={
              <Suspense fallback={<UserMenuSkeleton />}>
                <SessionUserMenu />
              </Suspense>
            }
          />
          <main className="mx-auto w-full max-w-screen-2xl flex-1 p-4 md:p-6">{children}</main>
        </AdminMain>
      </div>
    </SidebarProvider>
  );
}
