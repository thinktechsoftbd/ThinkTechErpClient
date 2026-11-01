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

export const metadata: Metadata = { title: "Opening Stock" };

export default function OpeningStockPage({ searchParams }: PageProps<"/inventory/opening-stock">) {
  return (
    <>
      <PageHeader
        title="Opening Stock"
        description="The stock you have when you start using the system, with its cost. Posting puts it on the books."
        breadcrumbs={inventoryCrumbs({ label: "Opening Stock" })}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <LinkButton href="/inventory/opening-stock/new">
                <Plus className="size-4" aria-hidden /> New opening stock
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <AdjustmentList kind="opening" searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}
