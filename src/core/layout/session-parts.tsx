import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { hasAnyRole } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import type { ModuleDefinition } from "@/core/modules/types";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { getAccessibleModules } from "@/modules/registry";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

// These components read the session cookie, so they must render inside <Suspense>.

export async function SessionSidebarNav() {
  const session = await requireSession();
  return <SidebarNav allowedModuleKeys={getAccessibleModules(session.roles).map((module) => module.key)} />;
}

export async function SessionUserMenu() {
  const session = await requireSession();
  return (
    <UserMenu
      user={{
        displayName: session.displayName,
        userName: session.userName,
        email: session.email,
        roles: session.roles,
      }}
    />
  );
}

/** Renders a module's pages only for users holding one of its roles. */
export async function ModuleGate({ module, children }: { module: ModuleDefinition; children: ReactNode }) {
  const session = await requireSession();
  if (hasAnyRole(session.roles, module.roles)) return children;

  return (
    <Card>
      <EmptyState
        icon={ShieldAlert}
        title={`You don't have access to ${module.name}`}
        description={`This module requires one of these roles: ${module.roles?.join(", ")}. Ask a security administrator to grant access.`}
        action={<LinkButton href="/dashboard" variant="outline">Back to dashboard</LinkButton>}
      />
    </Card>
  );
}
