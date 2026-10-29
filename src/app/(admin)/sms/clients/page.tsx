import type { Metadata } from "next";
import { Users } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, parseOffset } from "@/core/ui/pagination";
import { smsApi } from "@/modules/sms/api";
import { NewClientButton } from "@/modules/sms/components/client-dialogs";
import { ClientsTable } from "@/modules/sms/components/tables";
import { SMS_PAGE_SIZE } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS clients" };

export default function SmsClientsPage({ searchParams }: PageProps<"/sms/clients">) {
  return (
    <>
      <PageHeader
        title="SMS clients"
        description="Accounts that receive SMS allocations and send through the API."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Clients" }]}
        actions={<NewClientButton />}
      />
      <Card>
        <CardHeader title="All clients" description="Newest first." />
        <Suspense fallback={<TableSkeleton />}>
          <ClientsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ClientsList({ searchParams }: Pick<PageProps<"/sms/clients">, "searchParams">) {
  const offset = parseOffset((await searchParams).offset);
  const result = await tryApi(() => smsApi.getClients(SMS_PAGE_SIZE, offset));
  if (!result.ok) return <ApiErrorState error={result.error} />;

  if (result.data.length === 0 && offset === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No SMS clients yet"
        description="Create a client, then allocate SMS from the platform balance."
        action={<NewClientButton />}
      />
    );
  }

  return (
    <>
      <ClientsTable clients={result.data} />
      <Pagination basePath="/sms/clients" offset={offset} limit={SMS_PAGE_SIZE} count={result.data.length} />
    </>
  );
}
