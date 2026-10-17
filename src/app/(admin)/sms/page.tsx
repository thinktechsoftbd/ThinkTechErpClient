import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, StatGridSkeleton, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { smsApi } from "@/modules/sms/api";
import { BalanceCards } from "@/modules/sms/components/balance-cards";
import { TransactionsTable } from "@/modules/sms/components/tables";

export const metadata: Metadata = { title: "SMS" };

export default function SmsOverviewPage() {
  return (
    <>
      <PageHeader
        title="SMS overview"
        description="Platform balance purchased from ADN and distributed to client accounts."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS" }]}
        actions={
          <>
            <LinkButton href="/sms/purchases" variant="outline">
              Record purchase
            </LinkButton>
            <LinkButton href="/sms/clients/new">
              <Plus className="size-4" aria-hidden /> New client
            </LinkButton>
          </>
        }
      />
      <Suspense fallback={<StatGridSkeleton count={5} />}>
        <PlatformBalance />
      </Suspense>
      <Card className="mt-6">
        <CardHeader
          title="Recent transactions"
          actions={
            <LinkButton href="/sms/transactions" variant="outline" size="sm">
              View all
            </LinkButton>
          }
        />
        <Suspense fallback={<TableSkeleton />}>
          <RecentTransactions />
        </Suspense>
      </Card>
    </>
  );
}

async function PlatformBalance() {
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

async function RecentTransactions() {
  const result = await tryApi(() => smsApi.getTransactions(undefined, 10, 0));
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0) {
    return <EmptyState title="No transactions yet" description="Record an ADN purchase to start the ledger." />;
  }
  return <TransactionsTable transactions={result.data} />;
}
