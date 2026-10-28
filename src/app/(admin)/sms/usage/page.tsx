import type { Metadata } from "next";
import { ArrowLeftRight, Send, Users, Wallet } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { StatusBadge } from "@/core/ui/badge";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { EmptyState, StatCard, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { smsApi } from "@/modules/sms/api";
import { NewClientButton } from "@/modules/sms/components/client-dialogs";
import { ClientPickerForm, UsageForm } from "@/modules/sms/components/forms";
import { UsageTable } from "@/modules/sms/components/tables";
import { SMS_PAGE_SIZE } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS usage" };

const basePath = "/sms/usage";
/** Largest page the API allows; the picker lists clients from it. */
const CLIENT_PICKER_LIMIT = 500;

export default function SmsUsagePage({ searchParams }: PageProps<"/sms/usage">) {
  return (
    <>
      <PageHeader
        title="Usage"
        description="SMS sent by each client, as recorded through the client API. Recording usage deducts from the client's balance."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Usage" }]}
      />
      <Suspense
        fallback={
          <Card>
            <TableSkeleton />
          </Card>
        }
      >
        <UsageContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function UsageContent({ searchParams }: Pick<PageProps<"/sms/usage">, "searchParams">) {
  const query = await searchParams;
  const clientId = firstParam(query.clientId);
  const offset = parseOffset(query.offset);

  const clients = await tryApi(() => smsApi.getClients(CLIENT_PICKER_LIMIT, 0));
  if (!clients.ok) {
    return (
      <Card>
        <ApiErrorState error={clients.error} />
      </Card>
    );
  }
  if (clients.data.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="No SMS clients yet" action={<NewClientButton />} />
      </Card>
    );
  }

  const picker = <ClientPickerForm action={basePath} clients={clients.data} clientId={clientId} />;
  if (!clientId) {
    return (
      <Card>
        <CardHeader title="Client" actions={picker} />
        <EmptyState icon={Send} title="Choose a client" description="Pick a client to see and record its SMS usage." />
      </Card>
    );
  }

  // Balance through the client-facing endpoint (SmsClientController), the same one client tokens use.
  const balance = await tryApi(() => smsApi.getClientBalance(clientId));
  if (!balance.ok) {
    return (
      <Card>
        <CardHeader title="Client" actions={picker} />
        <ApiErrorState error={balance.error} notFoundHint={`There is no SMS client "${clientId}".`} />
      </Card>
    );
  }
  const client = balance.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-3">
              {client.displayName} <StatusBadge active={client.isActive} />
            </span>
          }
          description={
            <>
              Client ID <code className="font-mono">{client.clientId}</code>
            </>
          }
          actions={picker}
        />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Available SMS" value={formatNumber(client.availableSms)} icon={Wallet} />
          <StatCard label="Total allocated" value={formatNumber(client.totalAllocatedSms)} icon={ArrowLeftRight} />
          <StatCard label="Total consumed" value={formatNumber(client.totalConsumedSms)} icon={Send} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Record usage" description="Use this to log SMS sent outside the client API, e.g. a manual correction." />
        <CardBody>
          <UsageForm clientId={client.clientId} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Usage history" description="Newest first." />
        <Suspense key={`${client.clientId}-${offset}`} fallback={<TableSkeleton />}>
          <UsageHistory clientId={client.clientId} offset={offset} />
        </Suspense>
      </Card>
    </div>
  );
}

async function UsageHistory({ clientId, offset }: { clientId: string; offset: number }) {
  const result = await tryApi(() => smsApi.getClientUsage(clientId, SMS_PAGE_SIZE, offset));
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0 && offset === 0) return <EmptyState icon={Send} title="No SMS sent yet" />;
  return (
    <>
      <UsageTable usage={result.data} />
      <Pagination basePath={basePath} query={{ clientId }} offset={offset} limit={SMS_PAGE_SIZE} count={result.data.length} />
    </>
  );
}
