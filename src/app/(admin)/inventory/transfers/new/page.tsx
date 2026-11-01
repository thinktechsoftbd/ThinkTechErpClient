import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManageInventory } from "@/modules/inventory/access";
import { saveTransferAction } from "@/modules/inventory/actions/documents";
import { StockDocumentEditor } from "@/modules/inventory/components/documents/stock-document-editor";
import { inventoryCrumbs, loadStockEditorOptions } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "New Stock Transfer" };

export default function NewStockTransferPage() {
  return (
    <>
      <PageHeader
        title="New transfer"
        description="Send stock from one warehouse to another, e.g. from the godown to the shop."
        breadcrumbs={inventoryCrumbs({ label: "Stock Transfers", href: "/inventory/transfers" }, { label: "New" })}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewTransfer />
      </Suspense>
    </>
  );
}

async function NewTransfer() {
  const [session, options] = await Promise.all([requireSession(), loadStockEditorOptions()]);
  if (!options.ok)
    return (
      <Card>
        <ApiErrorState error={options.error} />
      </Card>
    );
  return (
    <StockDocumentEditor
      mode="transfer"
      action={saveTransferAction.bind(null, null)}
      options={options.data}
      canPost={canManageInventory(session)}
      cancelHref="/inventory/transfers"
    />
  );
}
