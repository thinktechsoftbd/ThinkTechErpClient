import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { Skeleton, StatGridSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDateTime } from "@/core/utils/format";
import { getAccessibleModules } from "@/modules/registry";
import { smsApi } from "@/modules/sms/api";
import { BalanceCards } from "@/modules/sms/components/balance-cards";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your ERP modules." />
      <Suspense
        fallback={
          <div className="space-y-6">
            <Skeleton className="h-28 rounded-2xl" />
            <StatGridSkeleton count={3} />
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </>
  );
}

async function DashboardContent() {
  const session = await requireSession();
  const accessible = getAccessibleModules(session);
  const canSeeSms = accessible.some((module) => module.key === "sms");

  return (
    <div className="space-y-8">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -top-16 -right-16 size-48 rounded-full bg-brand-500/10" aria-hidden />
        <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back</p>
        <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">{session.displayName}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          {session.roles.length > 0 ? (
            session.roles.map((role) => (
              <Badge key={role} tone="brand">
                {role}
              </Badge>
            ))
          ) : (
            <Badge>No roles assigned</Badge>
          )}
          <span className="ml-1">Session valid until {formatDateTime(new Date(session.expiresAt).toISOString())}</span>
        </div>
      </Card>

      {canSeeSms && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">SMS balance</h2>
            <Link href="/sms" className="text-sm font-medium text-brand-500 hover:underline">
              Open SMS
            </Link>
          </div>
          <Suspense fallback={<StatGridSkeleton count={5} />}>
            <SmsSnapshot />
          </Suspense>
        </section>
      )}

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
    </div>
  );
}

async function SmsSnapshot() {
  const result = await tryApi(() => smsApi.getPlatformBalance());
  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  return <BalanceCards balance={result.data} />;
}
