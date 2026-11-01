import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { Card } from "@/core/ui/card";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { PageSkeleton } from "@/core/ui/feedback";
import { buildHref } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { purchaseApi } from "@/modules/purchase/api";

type Props = PageProps<"/purchase/suppliers/[supplierId]">;

/**
 * Suppliers are viewed and edited on the Suppliers list; a link to one supplier (e.g. from the
 * supplier ledger) opens that list searched by the supplier's code.
 */
export default function SupplierPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SupplierRedirect params={params} />
    </Suspense>
  );
}

async function SupplierRedirect({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).supplierId);
  if (id === null) notFound();
  const result = await tryApi(() => purchaseApi.suppliers.get(id));
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }
  redirect(buildHref("/purchase/suppliers", { q: result.data.code }));
}
