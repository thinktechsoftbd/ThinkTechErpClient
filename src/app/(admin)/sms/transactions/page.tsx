import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { smsApi } from "@/modules/sms/api";
import { ClientFilterForm } from "@/modules/sms/components/forms";
import { TransactionsTable } from "@/modules/sms/components/tables";
import { SMS_PAGE_SIZE } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS transactions" };

const basePath = "/sms/transactions";

export default function SmsTransactionsPage({ searchParams }: PageProps<"/sms/transactions">) {
  return (
    <>
      <PageHeader
        title="Balance transactions"
        description="The full ledger: purchases, allocations and usage with running balances."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Transactions" }]}
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <TransactionsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function TransactionsList({ searchParams }: Pick<PageProps<"/sms/transactions">, "searchParams">) {
  const query = await searchParams;
  const clientId = firstParam(query.clientId);
  const offset = parseOffset(query.offset);
  const result = await tryApi(() => smsApi.getTransactions(clientId, SMS_PAGE_SIZE, offset));

  return (
    <>
      <CardHeader title="Ledger" actions={<ClientFilterForm action={basePath} clientId={clientId} />} />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.length === 0 && offset === 0 ? (
        <EmptyState icon={ArrowLeftRight} title={clientId ? `No transactions for ${clientId}` : "No transactions yet"} />
      ) : (
        <>
          <TransactionsTable transactions={result.data} />
          <Pagination basePath={basePath} query={{ clientId }} offset={offset} limit={SMS_PAGE_SIZE} count={result.data.length} />
        </>
      )}
    </>
  );
}
