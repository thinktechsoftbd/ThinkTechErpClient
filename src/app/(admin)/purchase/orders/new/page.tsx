import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManagePurchase } from "@/modules/purchase/access";
import { saveOrderAction } from "@/modules/purchase/actions/orders";
import { PurchaseDocumentEditor } from "@/modules/purchase/components/purchase-document-editor";
import { loadPurchaseEditorOptions } from "@/modules/purchase/editor-data";

export const metadata: Metadata = { title: "New Purchase Order" };

export default function NewPurchaseOrderPage() {
  return (
    <>
      <PageHeader
        title="New purchase order"
        description="What you are ordering from the supplier. Approve it to send it; nothing moves until the goods are received."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Purchase Orders", href: "/purchase/orders" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewOrder />
      </Suspense>
    </>
  );
}

async function NewOrder() {
  const [session, options] = await Promise.all([requireSession(), loadPurchaseEditorOptions()]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;

  return (
    <PurchaseDocumentEditor
      mode="order"
      action={saveOrderAction.bind(null, null)}
      options={options.data}
      canPost={canManagePurchase(session)}
      postLabel="Save & approve"
      cancelHref="/purchase/orders"
    />
  );
}
