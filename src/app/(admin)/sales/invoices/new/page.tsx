import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSession } from "@/core/auth/session";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { canManageSales } from "@/modules/sales/access";
import { saveSaleAction } from "@/modules/sales/actions/invoices";
import { SalesEditor } from "@/modules/sales/components/sales-editor";
import { loadSalesEditorOptions } from "@/modules/sales/editor-data";

export const metadata: Metadata = { title: "New Sale" };

export default function NewSalePage() {
  return (
    <>
      <PageHeader
        title="New sale"
        description="Scan or search the items, choose cash or credit, and complete the sale."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Inventory", href: "/inventory" },
          { label: "Sales", href: "/sales/invoices" },
          { label: "New" },
        ]}
      />
      <Suspense fallback={<PageSkeleton />}>
        <NewSale />
      </Suspense>
    </>
  );
}

async function NewSale() {
  const [session, options] = await Promise.all([requireSession(), loadSalesEditorOptions()]);
  if (!options.ok) return <Card><ApiErrorState error={options.error} /></Card>;
  const canManage = canManageSales(session);
  return (
    <SalesEditor
      action={saveSaleAction.bind(null, null)}
      options={options.data}
      canPost={canManage}
      canAddCustomer={canManage}
      cancelHref="/sales/invoices"
    />
  );
}
