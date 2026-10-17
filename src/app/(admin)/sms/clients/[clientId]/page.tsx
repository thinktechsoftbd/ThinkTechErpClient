import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeftRight, Send, Wallet } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { StatusBadge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { EmptyState, PageSkeleton, StatCard, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, buildHref, parseOffset } from "@/core/ui/pagination";
import { LinkTabs } from "@/core/ui/tabs";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { decodeParam } from "@/core/utils/params";
import { smsApi } from "@/modules/sms/api";
import { AllocateForm, ClientEditForm } from "@/modules/sms/components/forms";
import { AllocationsTable, TransactionsTable, UsageTable } from "@/modules/sms/components/tables";
import { SMS_PAGE_SIZE } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS client" };

type Props = PageProps<"/sms/clients/[clientId]">;

const tabs = [
  { key: "allocations", label: "Allocations" },
  { key: "usage", label: "Usage" },
  { key: "transactions", label: "Transactions" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

export default function SmsClientPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClientDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientDetail({ params, searchParams }: Props) {
  const clientId = decodeParam((await params).clientId);
  const query = await searchParams;
  const tab: TabKey = tabs.some((item) => item.key === query.tab) ? (query.tab as TabKey) : "allocations";
  const offset = parseOffset(query.offset);

  const result = await tryApi(() => smsApi.getClient(clientId));
  if (!result.ok && result.error.status === 404) notFound();
  if (!result.ok) {
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  const client = result.data;
  const basePath = `/sms/clients/${encodeURIComponent(client.clientId)}`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {client.displayName} <StatusBadge active={client.isActive} />
          </span>
        }
        description={
          <>
            Client ID <code className="font-mono">{client.clientId}</code> · created {formatDateTime(client.createdAt)} ·
            updated {formatDateTime(client.updatedAt)}
          </>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SMS", href: "/sms" },
          { label: "Clients", href: "/sms/clients" },
          { label: client.clientId },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available SMS" value={formatNumber(client.availableSms)} icon={Wallet} />
        <StatCard label="Total allocated" value={formatNumber(client.totalAllocatedSms)} icon={ArrowLeftRight} />
        <StatCard label="Total consumed" value={formatNumber(client.totalConsumedSms)} icon={Send} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Client details" />
          <CardBody>
            <ClientEditForm client={client} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Allocate SMS" description="Transfer SMS from the platform's unallocated balance." />
          <CardBody>
            {!client.isActive && (
              <Alert tone="warning" className="mb-5">
                This client is inactive. The API may reject allocations until it is reactivated.
              </Alert>
            )}
            <AllocateForm clientId={client.clientId} />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <LinkTabs
          active={tab}
          tabs={tabs.map((item) => ({ key: item.key, label: item.label, href: buildHref(basePath, { tab: item.key }) }))}
        />
        <Suspense key={`${tab}-${offset}`} fallback={<TableSkeleton />}>
          <ClientHistory clientId={client.clientId} tab={tab} offset={offset} basePath={basePath} />
        </Suspense>
      </Card>
    </>
  );
}

async function ClientHistory({
  clientId,
  tab,
  offset,
  basePath,
}: {
  clientId: string;
  tab: TabKey;
  offset: number;
  basePath: string;
}) {
  const pagination = (count: number) => (
    <Pagination basePath={basePath} query={{ tab }} offset={offset} limit={SMS_PAGE_SIZE} count={count} />
  );

  if (tab === "usage") {
    const result = await tryApi(() => smsApi.getClientUsage(clientId, SMS_PAGE_SIZE, offset));
    if (!result.ok) return <ApiErrorState error={result.error} />;
    if (result.data.length === 0 && offset === 0) return <EmptyState title="No SMS sent yet" />;
    return (
      <>
        <UsageTable usage={result.data} />
        {pagination(result.data.length)}
      </>
    );
  }

  if (tab === "transactions") {
    const result = await tryApi(() => smsApi.getTransactions(clientId, SMS_PAGE_SIZE, offset));
    if (!result.ok) return <ApiErrorState error={result.error} />;
    if (result.data.length === 0 && offset === 0) return <EmptyState title="No transactions yet" />;
    return (
      <>
        <TransactionsTable transactions={result.data} showClient={false} />
        {pagination(result.data.length)}
      </>
    );
  }

  const result = await tryApi(() => smsApi.getAllocations(clientId, SMS_PAGE_SIZE, offset));
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0 && offset === 0) {
    return <EmptyState title="No allocations yet" description="Use the form above to allocate SMS to this client." />;
  }
  return (
    <>
      <AllocationsTable allocations={result.data} showClient={false} />
      {pagination(result.data.length)}
    </>
  );
}
