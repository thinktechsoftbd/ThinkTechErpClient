import { Suspense, type ReactNode } from "react";
import { AdminMain, AppSidebar, SidebarBackdrop } from "@/core/layout/app-sidebar";
import { AppHeader } from "@/core/layout/app-header";
import { OrganizationSwitcher } from "@/core/layout/organization-switcher";
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
            organization={
              <Suspense>
                <OrganizationSwitcher />
              </Suspense>
            }
            userMenu={
              <Suspense fallback={<UserMenuSkeleton />}>
                <SessionUserMenu />
              </Suspense>
            }
          />
          {/* Full width on every screen (no centred max width, which left empty bands on wide monitors). */}
          <main className="w-full flex-1 p-4 md:px-5 md:py-6">{children}</main>
        </AdminMain>
      </div>
    </SidebarProvider>
  );
}
