import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Card } from "@/core/ui/card";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { PageSkeleton } from "@/core/ui/feedback";
import { buildHref } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { salesApi } from "@/modules/sales/api";

type Props = PageProps<"/sales/customers/[customerId]">;

/**
 * Customers are viewed and edited on the Customers list; a link to one customer (e.g. from the
 * customer ledger) opens that list searched by the customer's code.
 */
export default function CustomerPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerRedirect params={params} />
    </Suspense>
  );
}

async function CustomerRedirect({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).customerId);
  if (id === null) notFound();
  const result = await tryApi(() => salesApi.customers.get(id));
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }
  redirect(buildHref("/sales/customers", { q: result.data.code }));
}
