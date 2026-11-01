import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageInventory } from "@/modules/inventory/access";
import { cancelCountAction, saveCountAction } from "@/modules/inventory/actions/documents";
import { inventoryApi } from "@/modules/inventory/api";
import { CountSheet } from "@/modules/inventory/components/documents/count-sheet";
import { inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "Stock Count" };

type Props = PageProps<"/inventory/counts/[countId]">;

export default function StockCountPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CountDetail params={params} />
    </Suspense>
  );
}

async function CountDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).countId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => inventoryApi.counts.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }

  const count = result.data;
  const canManage = canManageInventory(session);
  const inProgress = count.status === "InProgress";
  const adjustmentLink = count.stockAdjustmentId ? `/inventory/adjustments/${count.stockAdjustmentId}` : null;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {count.countNo} <DocumentStatusBadge status={count.status} />
          </span>
        }
        description={`${count.warehouseName} · ${count.categoryName ?? "All products"} · ${formatDate(count.countDate)}`}
        breadcrumbs={inventoryCrumbs({ label: "Stock Counts", href: "/inventory/counts" }, { label: count.countNo })}
        actions={
          <div className="flex flex-wrap items-start gap-2">
            {adjustmentLink && (
              <LinkButton href={adjustmentLink} variant="outline" size="sm">
                View adjustment {count.stockAdjustmentNo}
              </LinkButton>
            )}
            {canManage && inProgress && (
              <DocumentActionButton
                action={cancelCountAction.bind(null, id)}
                variant="danger"
                confirmMessage="Cancel this count? Nothing is adjusted and the sheet can't be used again."
              >
                Cancel count
              </DocumentActionButton>
            )}
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                { label: "Warehouse", value: count.warehouseName },
                { label: "Category", value: count.categoryName ?? "All products" },
                { label: "Count date", value: formatDate(count.countDate) },
                { label: "System quantities taken", value: count.startedAt ? formatDateTime(count.startedAt) : formatDateTime(count.createdAt) },
                { label: "Posted", value: count.postedAt ? formatDateTime(count.postedAt) : null },
                {
                  label: "Difference adjusted",
                  value: adjustmentLink ? (
                    <>
                      <Link href={adjustmentLink} className="text-brand-500 hover:underline">
                        {count.stockAdjustmentNo ?? "Adjustment"}
                      </Link>{" "}
                      · {formatAmount(count.differenceValue)}
                    </>
                  ) : null,
                },
                { label: "Remarks", value: inProgress ? null : count.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <CountSheet count={count} action={canManage && inProgress ? saveCountAction.bind(null, id) : undefined} />
      </div>
    </>
  );
}
