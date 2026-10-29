import type { Metadata } from "next";
import Link from "next/link";
import { List, Table2, type LucideIcon } from "lucide-react";
import { Suspense } from "react";
import { tryApi, type ApiResult } from "@/core/api/client";
import { Badge } from "@/core/ui/badge";
import { StatCard, StatGridSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatNumber } from "@/core/utils/format";
import { settingsApi } from "@/modules/settings/api";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsOverviewPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Lookup tables are named lists (e.g. Currency); lookup data are their values, used in drop-downs across the ERP."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />
      <Suspense fallback={<StatGridSkeleton count={2} />}>
        <SettingsSummary />
      </Suspense>
    </>
  );
}

async function SettingsSummary() {
  const [tables, values] = await Promise.all([
    tryApi(async () => (await settingsApi.getLookupTables({ limit: 1, offset: 0 })).totalCount),
    tryApi(async () => (await settingsApi.getLookupData({ limit: 1, offset: 0 })).totalCount),
  ]);
  const areas: { label: string; href: string; icon: LucideIcon; count: ApiResult<number>; hint: string }[] = [
    { label: "Lookup Tables", href: "/settings/lookup-tables", icon: Table2, count: tables, hint: "Named lists of values" },
    { label: "Lookup Data", href: "/settings/lookup-data", icon: List, count: values, hint: "The values in those lists" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {areas.map((area) => (
        <Link key={area.href} href={area.href} className="rounded-2xl transition hover:shadow-theme-lg">
          <StatCard
            label={area.label}
            icon={area.icon}
            value={area.count.ok ? formatNumber(area.count.data) : <Badge tone="error">Unavailable</Badge>}
            hint={area.count.ok ? area.hint : area.count.error.message}
          />
        </Link>
      ))}
    </div>
  );
}
