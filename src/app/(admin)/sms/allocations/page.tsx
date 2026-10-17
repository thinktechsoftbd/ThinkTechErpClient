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
import { AllocationsTable } from "@/modules/sms/components/tables";
import { SMS_PAGE_SIZE } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS allocations" };

const basePath = "/sms/allocations";

export default function SmsAllocationsPage({ searchParams }: PageProps<"/sms/allocations">) {
  return (
    <>
      <PageHeader
        title="Allocations"
        description="SMS moved from the platform balance to client accounts."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Allocations" }]}
      />
      <Card>
        <Suspense fallback={<TableSkeleton />}>
          <AllocationsList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function AllocationsList({ searchParams }: Pick<PageProps<"/sms/allocations">, "searchParams">) {
  const query = await searchParams;
  const clientId = firstParam(query.clientId);
  const offset = parseOffset(query.offset);
  const result = await tryApi(() => smsApi.getAllocations(clientId, SMS_PAGE_SIZE, offset));

  return (
    <>
      <CardHeader title="Allocation history" actions={<ClientFilterForm action={basePath} clientId={clientId} />} />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.length === 0 && offset === 0 ? (
        <EmptyState icon={ArrowLeftRight} title={clientId ? `No allocations for ${clientId}` : "No allocations yet"} />
      ) : (
        <>
          <AllocationsTable allocations={result.data} />
          <Pagination basePath={basePath} query={{ clientId }} offset={offset} limit={SMS_PAGE_SIZE} count={result.data.length} />
        </>
      )}
    </>
  );
}
