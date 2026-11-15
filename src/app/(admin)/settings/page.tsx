import type { Metadata } from "next";
import Link from "next/link";
import { List, Map as MapIcon, MapPin, MapPinned, Table2, Truck, type LucideIcon } from "lucide-react";
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
        description="Lookup tables are named lists (e.g. Currency); lookup data are their values, used in drop-downs across the ERP. Divisions, districts and areas (upazilas, thanas and city areas) are where deliveries go; shipping zones group them by delivery time."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
      />
      <Suspense fallback={<StatGridSkeleton count={6} />}>
        <SettingsSummary />
      </Suspense>
    </>
  );
}

async function SettingsSummary() {
  const [tables, values, areas, divisions, districts, zones] = await Promise.all([
    tryApi(async () => (await settingsApi.getLookupTables({ limit: 1, offset: 0 })).totalCount),
    tryApi(async () => (await settingsApi.getLookupData({ limit: 1, offset: 0 })).totalCount),
    tryApi(async () => (await settingsApi.getAreas({ limit: 1, offset: 0 })).totalCount),
    tryApi(async () => (await settingsApi.listDivisions({ limit: 1, offset: 0 })).totalCount),
    tryApi(async () => (await settingsApi.listDistricts({ limit: 1, offset: 0 })).totalCount),
    tryApi(async () => (await settingsApi.listShippingZones({ limit: 1, offset: 0 })).totalCount),
  ]);
  const sections: { label: string; href: string; icon: LucideIcon; count: ApiResult<number>; hint: string }[] = [
    { label: "Lookup Tables", href: "/settings/lookup-tables", icon: Table2, count: tables, hint: "Named lists of values" },
    { label: "Lookup Data", href: "/settings/lookup-data", icon: List, count: values, hint: "The values in those lists" },
    { label: "Areas", href: "/settings/areas", icon: MapPin, count: areas, hint: "Upazilas, thanas and city areas" },
    { label: "Divisions", href: "/settings/divisions", icon: MapIcon, count: divisions, hint: "The country's divisions" },
    { label: "Districts", href: "/settings/districts", icon: MapPinned, count: districts, hint: "The districts of each division" },
    { label: "Shipping Zones", href: "/settings/shipping-zones", icon: Truck, count: zones, hint: "Delivery zones and their days" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {sections.map((section) => (
        <Link key={section.href} href={section.href} className="rounded-2xl transition hover:shadow-theme-lg">
          <StatCard
            label={section.label}
            icon={section.icon}
            value={section.count.ok ? formatNumber(section.count.data) : <Badge tone="error">Unavailable</Badge>}
            hint={section.count.ok ? section.hint : section.count.error.message}
          />
        </Link>
      ))}
    </div>
  );
}
