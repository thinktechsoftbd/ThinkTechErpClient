import type { Metadata } from "next";
import { ShoppingCart } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, parseOffset } from "@/core/ui/pagination";
import { smsApi } from "@/modules/sms/api";
import { PurchaseDialogButton } from "@/modules/sms/components/client-dialogs";
import { PurchasesTable } from "@/modules/sms/components/tables";
import { SMS_PAGE_SIZE } from "@/modules/sms/types";

export const metadata: Metadata = { title: "SMS purchases" };

export default function SmsPurchasesPage({ searchParams }: PageProps<"/sms/purchases">) {
  return (
    <>
      <PageHeader
        title="ADN purchases"
        description="SMS bought from the ADN provider. Each purchase adds to the platform's unallocated balance."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "SMS", href: "/sms" }, { label: "Purchases" }]}
        actions={<PurchaseDialogButton />}
      />
      <Card className="mt-6">
        <CardHeader title="Purchase history" description="Newest first." />
        <Suspense fallback={<TableSkeleton />}>
          <PurchasesList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function PurchasesList({ searchParams }: Pick<PageProps<"/sms/purchases">, "searchParams">) {
  const offset = parseOffset((await searchParams).offset);
  const result = await tryApi(() => smsApi.getPurchases(SMS_PAGE_SIZE, offset));
  if (!result.ok) return <ApiErrorState error={result.error} />;
  if (result.data.length === 0 && offset === 0) {
    return <EmptyState icon={ShoppingCart} title="No purchases recorded yet" />;
  }
  return (
    <>
      <PurchasesTable purchases={result.data} />
      <Pagination basePath="/sms/purchases" offset={offset} limit={SMS_PAGE_SIZE} count={result.data.length} />
    </>
  );
}
