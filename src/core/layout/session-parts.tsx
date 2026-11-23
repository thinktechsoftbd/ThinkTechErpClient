import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { apiFetch, tryApi } from "@/core/api/client";
import { canAccessModule } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { serverEnv } from "@/core/config/server-env";
import type { ModuleDefinition } from "@/core/modules/types";
import { getCurrentOrganization } from "@/core/org/organization";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { getAccessibleModules } from "@/modules/registry";
import { ApiSidebarNav } from "./api-sidebar-nav";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { getUserMenus } from "./user-menus";

// These components read the session cookie, so they must render inside <Suspense>.

/** The user's menu tree from the API; the module registry's menu when it can't be loaded. */
export async function SessionSidebarNav() {
  const session = await requireSession();
  const menus = await getUserMenus();
  if (menus) return <ApiSidebarNav menus={menus} />;
  return <SidebarNav allowedModuleKeys={getAccessibleModules(session).map((module) => module.key)} />;
}

/** The signed-in user's own photo (GET /api/security/auth/me); null without one, for dev sign-in, or if the call fails. */
async function getCurrentUserPhoto(): Promise<string | null> {
  if (serverEnv.authMode === "dev") return null;
  const result = await tryApi(() => apiFetch<{ photoUrl?: string | null }>("/api/security/auth/me"));
  return result.ok ? (result.data.photoUrl ?? null) : null;
}

/** The account menu, pictured with the signed-in user's own photo (else their initials). */
export async function SessionUserMenu() {
  const [session, organization, photoUrl] = await Promise.all([requireSession(), getCurrentOrganization(), getCurrentUserPhoto()]);
  return (
    <UserMenu
      user={{
        displayName: session.displayName,
        userName: session.userName,
        email: session.email,
        roles: session.roles,
        photoUrl,
      }}
      organization={organization ? { name: organization.name } : null}
    />
  );
}

/** Renders a module's pages only for users holding one of its roles or access permissions. */
export async function ModuleGate({ module, children }: { module: ModuleDefinition; children: ReactNode }) {
  const session = await requireSession();
  if (canAccessModule(session, module)) return children;

  const requirements = [
    module.roles?.length ? `one of these roles: ${module.roles.join(", ")}` : "",
    module.accessPermissions?.length ? `one of these permissions: ${module.accessPermissions.join(", ")}` : "",
  ].filter(Boolean);

  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title={`You don't have access to ${module.name}`}
        description={`This module requires ${requirements.join(" or ")}. Ask a security administrator to grant access.`}
        action={<LinkButton href="/dashboard" variant="outline">Back to dashboard</LinkButton>}
      />
    </Card>
  );
}
