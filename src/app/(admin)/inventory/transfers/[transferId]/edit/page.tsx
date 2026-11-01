import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { parseIdParam } from "@/core/utils/params";
import { canManageInventory } from "@/modules/inventory/access";
import { saveTransferAction } from "@/modules/inventory/actions/documents";
import { inventoryApi } from "@/modules/inventory/api";
import { StockDocumentEditor } from "@/modules/inventory/components/documents/stock-document-editor";
import {
  inventoryCrumbs,
  loadLineProducts,
  loadStockEditorOptions,
} from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "Edit Stock Transfer" };

type Props = PageProps<"/inventory/transfers/[transferId]/edit">;

export default function EditStockTransferPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditTransfer params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditTransfer({ params, searchParams }: Props) {
  const id = parseIdParam((await params).transferId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, result, options] = await Promise.all([
    requireSession(),
    tryApi(() => inventoryApi.transfers.get(id)),
    loadStockEditorOptions(),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  if (result.data.status !== "Draft") redirect(`/inventory/transfers/${id}`);
  if (!options.ok)
    return (
      <Card>
        <ApiErrorState error={options.error} />
      </Card>
    );
  const products = await loadLineProducts(result.data.lines);
  if (!products.ok)
    return (
      <Card>
        <ApiErrorState error={products.error} />
      </Card>
    );

  const transfer = result.data;
  return (
    <>
      <PageHeader
        title={`Edit ${transfer.transferNo}`}
        description="A draft: nothing has moved yet. Dispatch it to send the stock."
        breadcrumbs={inventoryCrumbs(
          { label: "Stock Transfers", href: "/inventory/transfers" },
          { label: transfer.transferNo, href: `/inventory/transfers/${id}` },
          { label: "Edit" },
        )}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <StockDocumentEditor
        mode="transfer"
        action={saveTransferAction.bind(null, id)}
        options={options.data}
        canPost={canManageInventory(session)}
        cancelHref={`/inventory/transfers/${id}`}
        initial={{
          date: transfer.transferDate,
          warehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
          remarks: transfer.remarks ?? "",
          lines: transfer.lines,
          products: products.data,
        }}
      />
    </>
  );
}
