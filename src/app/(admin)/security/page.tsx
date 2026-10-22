import type { Metadata } from "next";
import Link from "next/link";
import { Building2, KeyRound, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Suspense } from "react";
import { tryApi, type ApiResult } from "@/core/api/client";
import { Badge } from "@/core/ui/badge";
import { StatCard, StatGridSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatNumber } from "@/core/utils/format";
import { securityApi } from "@/modules/security/api";

export const metadata: Metadata = { title: "Security" };

export default function SecurityOverviewPage() {
  return (
    <>
      <PageHeader
        title="Security"
        description="Organizations, users, roles and the permissions that control access to every module."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Security" }]}
      />
      <Suspense fallback={<StatGridSkeleton count={4} />}>
        <SecuritySummary />
      </Suspense>
    </>
  );
}

async function SecuritySummary() {
  const [organizations, users, roles, permissions] = await Promise.all([
    tryApi(async () => (await securityApi.getOrganizations()).length),
    tryApi(async () => (await securityApi.getUsers({ limit: 1, offset: 0 })).totalCount),
    tryApi(async () => (await securityApi.getRoles()).length),
    tryApi(async () => (await securityApi.getPermissions()).length),
  ]);

  const areas: { label: string; href: string; icon: LucideIcon; count: ApiResult<number>; hint: string }[] = [
    { label: "Organizations", href: "/security/organizations", icon: Building2, count: organizations, hint: "Companies and branches" },
    { label: "Users", href: "/security/users", icon: Users, count: users, hint: "Accounts that can sign in" },
    { label: "Roles", href: "/security/roles", icon: ShieldCheck, count: roles, hint: "Bundles of permissions" },
    { label: "Permissions", href: "/security/permissions", icon: KeyRound, count: permissions, hint: "MODULE.ACTION codes" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {areas.map((area) => (
        <Link key={area.href} href={area.href} className="rounded-2xl transition hover:shadow-theme-lg">
          <StatCard
            label={area.label}
            icon={area.icon}
            value={
              area.count.ok ? (
                formatNumber(area.count.data)
              ) : (
                <Badge tone="error">{area.count.error.status ? `Error ${area.count.error.status}` : "Unreachable"}</Badge>
              )
            }
            hint={area.count.ok ? area.hint : area.count.error.message}
          />
        </Link>
      ))}
    </div>
  );
}
