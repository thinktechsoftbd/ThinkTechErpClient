import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { StatusBadge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { LinkTabs } from "@/core/ui/tabs";
import { formatDateTime } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { canManageSecurity } from "@/modules/security/access";
import { setUserMenusAction } from "@/modules/security/actions";
import { securityApi } from "@/modules/security/api";
import { UserMenuAccessForm } from "@/modules/security/components/user-menu-access-form";
import { UserPasswordForm, UserPermissionsForm, UserProfileForm } from "@/modules/security/components/user-forms";
import type { SecurityUser } from "@/modules/security/types";

export const metadata: Metadata = { title: "User" };

type Props = PageProps<"/security/users/[userId]">;

const TABS = [
  { key: "profile", label: "Profile & roles" },
  { key: "permissions", label: "Permissions" },
  { key: "menus", label: "Menu access" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export default function UserPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function UserDetail({ params, searchParams }: Props) {
  const id = parseIdParam((await params).userId);
  if (id === null) notFound();
  const tabParam = firstParam((await searchParams).tab);
  const tab: TabKey = TABS.some((item) => item.key === tabParam) ? (tabParam as TabKey) : "profile";

  const [session, result] = await Promise.all([requireSession(), tryApi(() => securityApi.getUser(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }

  const user = result.data;
  const readOnly = !canManageSecurity(session);
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {user.name} <StatusBadge active={user.status === "ACTIVE"} />
          </span>
        }
        description={`${user.email} · created ${formatDateTime(user.createdAt)} · updated ${formatDateTime(user.updatedAt)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Security", href: "/security" },
          { label: "Users", href: "/security/users" },
          { label: user.name },
        ]}
      />
      <Card className="mb-6">
        <LinkTabs
          active={tab}
          tabs={TABS.map((item) => ({
            key: item.key,
            label: item.label,
            href: item.key === "profile" ? `/security/users/${user.id}` : `/security/users/${user.id}?tab=${item.key}`,
          }))}
        />
      </Card>
      <Suspense fallback={<TableSkeleton />}>
        {tab === "profile" && <ProfileTab user={user} readOnly={readOnly} />}
        {tab === "permissions" && <PermissionsTab userId={user.id} readOnly={readOnly} />}
        {tab === "menus" && <MenusTab userId={user.id} readOnly={readOnly} />}
      </Suspense>
    </>
  );
}

async function ProfileTab({ user, readOnly }: { user: SecurityUser; readOnly: boolean }) {
  const roles = await tryApi(() => securityApi.getRoles());
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader title="Profile and roles" />
        <CardBody>
          {roles.ok ? (
            <UserProfileForm user={user} roles={roles.data} readOnly={readOnly} />
          ) : (
            <ApiErrorState error={roles.error} />
          )}
        </CardBody>
      </Card>
      {!readOnly && (
        <Card>
          <CardHeader title="Password" description="Sets a new password for this user." />
          <CardBody>
            <UserPasswordForm userId={user.id} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

async function PermissionsTab({ userId, readOnly }: { userId: number; readOnly: boolean }) {
  const [permissions, granted] = await Promise.all([
    tryApi(() => securityApi.getPermissions()),
    tryApi(() => securityApi.getUserPermissions(userId)),
  ]);
  return (
    <Card>
      <CardHeader
        title="Permissions"
        description="The user holds every permission of their roles, plus any granted here directly."
      />
      <CardBody>
        {!permissions.ok ? (
          <ApiErrorState error={permissions.error} />
        ) : !granted.ok ? (
          <ApiErrorState error={granted.error} />
        ) : (
          <UserPermissionsForm userId={userId} permissions={permissions.data} granted={granted.data} readOnly={readOnly} />
        )}
      </CardBody>
    </Card>
  );
}

async function MenusTab({ userId, readOnly }: { userId: number; readOnly: boolean }) {
  const [menus, overrides, roles] = await Promise.all([
    tryApi(() => securityApi.getMenus()),
    tryApi(() => securityApi.getUserMenus(userId)),
    tryApi(() => securityApi.getRoles()),
  ]);
  let content: ReactNode;
  if (!menus.ok) content = <ApiErrorState error={menus.error} />;
  else if (!overrides.ok) content = <ApiErrorState error={overrides.error} />;
  else {
    content = (
      <UserMenuAccessForm
        action={setUserMenusAction.bind(null, userId)}
        menus={menus.data}
        overrides={overrides.data}
        roleNames={Object.fromEntries((roles.ok ? roles.data : []).map((role) => [role.id, role.name]))}
        readOnly={readOnly}
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title="Menu access"
        description="Menus on Default follow their role (or are shown to everyone). Custom rows override that for this user."
      />
      <CardBody>{content}</CardBody>
    </Card>
  );
}
