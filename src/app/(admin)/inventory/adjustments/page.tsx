import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { PermissionOnly } from "@/core/crud/permission-only";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { AdjustmentList, inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Stock Adjustments" };

export default function StockAdjustmentsPage({ searchParams }: PageProps<"/inventory/adjustments">) {
  return (
    <>
      <PageHeader
        title="Stock Adjustments"
        compact
        breadcrumbs={inventoryCrumbs({ label: "Stock Adjustments" })}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <LinkButton href="/inventory/adjustments/new">
                <Plus className="size-4" aria-hidden /> New adjustment
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <AdjustmentList kind="adjustment" searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
