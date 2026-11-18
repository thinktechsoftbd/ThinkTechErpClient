import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { Skeleton, StatGridSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { getDashboardOverview } from "@/modules/dashboard/api";
import {
  ExpiringWarrantyPanel,
  KpiCards,
  PurchaseVsSalesPanel,
  RecentTransactionsPanel,
  SalesByCategoryPanel,
  SalesTrendPanel,
  WarrantyStatusPanel,
} from "@/modules/dashboard/components/dashboard-sections";
import { PeriodPicker } from "@/modules/dashboard/components/period-picker";
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/modules/dashboard/types";
import { getAccessibleModules } from "@/modules/registry";
import { SmsStatCards } from "@/modules/sms/components/sms-stat-cards";
import { getSmsOverview } from "@/modules/sms/queries";

export const metadata: Metadata = { title: "Dashboard" };

type Props = PageProps<"/dashboard">;

export default function DashboardPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-blue-400 text-white shadow-theme-xs">
              <BarChart3 className="size-5" aria-hidden />
            </span>
            Dashboard
          </span>
        }
        description="Sales, purchases and warranty at a glance."
        actions={
          <Suspense>
            <PeriodPicker />
          </Suspense>
        }
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <StatGridSkeleton count={4} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

async function DashboardContent({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const periodParam = firstParam(query.period);
  const period: DashboardPeriod = DASHBOARD_PERIODS.find((p) => p.value === periodParam)?.value ?? "this-month";

  const [session, result] = await Promise.all([requireSession(), tryApi(() => getDashboardOverview(period))]);
  const accessible = getAccessibleModules(session);
  const canSeeSms = accessible.some((module) => module.key === "sms");

  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  const overview = result.data;
  const hasAnalytics = Boolean(overview.sales || overview.purchase || overview.warranty);

  return (
    <div className="space-y-6">
      <KpiCards overview={overview} />

      {hasAnalytics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <SalesTrendPanel overview={overview} />
          <PurchaseVsSalesPanel overview={overview} />
          <WarrantyStatusPanel overview={overview} />
        </div>
      )}

      {hasAnalytics && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-12">
          <RecentTransactionsPanel overview={overview} className="lg:col-span-2 xl:col-span-5" />
          <ExpiringWarrantyPanel overview={overview} className="xl:col-span-4" />
          <SalesByCategoryPanel overview={overview} className="xl:col-span-3" />
        </div>
      )}

      {canSeeSms && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">SMS</h2>
            <Link href="/sms" className="text-sm font-medium text-brand-500 hover:underline">
              Open SMS
            </Link>
          </div>
          <Suspense fallback={<StatGridSkeleton count={3} />}>
            <SmsSnapshot />
          </Suspense>
        </section>
      )}

      {/* Without sales, purchase or warranty access there are no figures: show where the user can go. */}
      {!hasAnalytics && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">Your modules</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accessible.map((module) => (
              <Link
                key={module.key}
                href={module.basePath}
                className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                    <module.icon className="size-5" aria-hidden />
                  </span>
                  {module.status === "planned" ? <Badge>Coming soon</Badge> : <Badge tone="success">Active</Badge>}
                </div>
                <p className="mt-4 font-semibold text-gray-800 dark:text-white/90">{module.name}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{module.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-500">
                  Open <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function SmsSnapshot() {
  const result = await getSmsOverview();
  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  return <SmsStatCards overview={result.data} show={["unallocated", "organizationAvailable", "used"]} />;
}
