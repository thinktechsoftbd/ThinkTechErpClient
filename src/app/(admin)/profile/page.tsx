import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { logoutAction } from "@/core/auth/actions";
import { requireSession } from "@/core/auth/session";
import { serverEnv } from "@/core/config/server-env";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDateTime } from "@/core/utils/format";

export const metadata: Metadata = { title: "My profile" };

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        title="My profile"
        description="Details from your current access token."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "My profile" }]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <ProfileDetails />
      </Suspense>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-3">
      <dt className="text-sm text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm font-medium break-all text-gray-800 sm:col-span-2 dark:text-white/90">{children}</dd>
    </div>
  );
}

async function ProfileDetails() {
  const session = await requireSession();
  return (
    <Card className="max-w-3xl">
      <CardHeader
        title={session.displayName}
        description={session.email ?? session.userName}
        actions={
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </form>
        }
      />
      <CardBody>
        <dl className="divide-y divide-gray-100 dark:divide-gray-800">
          <Row label="User ID">{session.userId}</Row>
          <Row label="User name">{session.userName}</Row>
          <Row label="Email">{session.email ?? "—"}</Row>
          <Row label="Roles">
            <span className="flex flex-wrap gap-1">
              {session.roles.length > 0 ? session.roles.map((role) => <Badge key={role} tone="brand">{role}</Badge>) : "—"}
            </span>
          </Row>
          {session.clientId && <Row label="SMS client">{session.clientId}</Row>}
          <Row label="Session expires">{formatDateTime(new Date(session.expiresAt).toISOString())}</Row>
          <Row label="Sign-in mode">{serverEnv.authMode === "dev" ? "Development (local token)" : "ThinkTechErp API"}</Row>
        </dl>
      </CardBody>
    </Card>
  );
}
