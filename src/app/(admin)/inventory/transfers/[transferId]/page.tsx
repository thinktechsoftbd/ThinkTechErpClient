import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, PackageCheck, Pencil } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts, TotalsList } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageInventory } from "@/modules/inventory/access";
import {
  cancelTransferAction,
  deleteTransferAction,
  dispatchTransferAction,
  receiveTransferAction,
} from "@/modules/inventory/actions/documents";
import { inventoryApi } from "@/modules/inventory/api";
import { ReceiveTransferForm } from "@/modules/inventory/components/documents/receive-transfer-form";
import { StockLinesTable } from "@/modules/inventory/components/documents/stock-lines-table";
import { inventoryCrumbs } from "@/modules/inventory/components/documents/stock-document-screens";

export const metadata: Metadata = { title: "Stock Transfer" };

type Props = PageProps<"/inventory/transfers/[transferId]">;

export default function StockTransferPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransferDetail params={params} />
    </Suspense>
  );
}

async function TransferDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).transferId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => inventoryApi.transfers.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }

  const transfer = result.data;
  const canManage = canManageInventory(session);
  const isDraft = transfer.status === "Draft";
  const inTransit = transfer.status === "InTransit";
  const received = transfer.status === "Received";
  const lost = transfer.lines.filter(
    (line) => line.receivedBaseQuantity !== null && line.receivedBaseQuantity < Math.abs(line.baseQuantity),
  ).length;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {transfer.transferNo} <DocumentStatusBadge status={transfer.status} />
          </span>
        }
        description={`${transfer.fromWarehouseName} → ${transfer.toWarehouseName} · ${formatDate(transfer.transferDate)}`}
        breadcrumbs={inventoryCrumbs({ label: "Stock Transfers", href: "/inventory/transfers" }, { label: transfer.transferNo })}
        actions={
          canManage && (
            <div className="flex flex-wrap items-start gap-2">
              {isDraft && (
                <>
                  <LinkButton href={`/inventory/transfers/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={dispatchTransferAction.bind(null, id)}
                    variant="primary"
                    confirmMessage={`Dispatch this transfer? The stock leaves ${transfer.fromWarehouseName} now and is in transit until ${transfer.toWarehouseName} receives it.`}
                  >
                    Dispatch
                  </DocumentActionButton>
                  <DocumentActionButton
                    action={deleteTransferAction.bind(null, id)}
                    variant="danger"
                    confirmMessage="Delete this draft transfer?"
                  >
                    Delete
                  </DocumentActionButton>
                </>
              )}
              {inTransit && (
                <LinkButton href="#receive" size="sm">
                  <PackageCheck className="size-4" aria-hidden /> Receive
                </LinkButton>
              )}
              {(inTransit || received) && (
                <DocumentActionButton
                  action={cancelTransferAction.bind(null, id)}
                  variant="danger"
                  confirmMessage={
                    inTransit
                      ? `Cancel this transfer? The stock goes back to ${transfer.fromWarehouseName}.`
                      : `Cancel this transfer? The stock received at ${transfer.toWarehouseName} is taken out again and goes back to ${transfer.fromWarehouseName}.`
                  }
                >
                  Cancel transfer
                </DocumentActionButton>
              )}
            </div>
          )
        }
      />

      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                {
                  label: "From → to",
                  value: (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {transfer.fromWarehouseName}
                      <ArrowRight className="size-3.5 text-gray-400" aria-label="to" />
                      {transfer.toWarehouseName}
                    </span>
                  ),
                },
                { label: "Transfer date", value: formatDate(transfer.transferDate) },
                { label: "Dispatched", value: transfer.dispatchedAt ? formatDateTime(transfer.dispatchedAt) : null },
                { label: "Received", value: transfer.receivedAt ? formatDateTime(transfer.receivedAt) : null },
                { label: "Lost in transit", value: lost > 0 ? `${lost} line(s) arrived short` : null },
                { label: "Remarks", value: transfer.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Items (${transfer.lines.length})`}
            description={isDraft ? "Valued at the average cost when dispatched." : inTransit ? "On the way." : undefined}
          />
          <StockLinesTable lines={transfer.lines} mode="transfer" />
          {!isDraft && (
            <CardBody>
              <TotalsList rows={[{ label: "Value", value: formatAmount(transfer.totalValue), strong: true }]} />
            </CardBody>
          )}
        </Card>

        {inTransit && canManage && (
          <div id="receive" className="scroll-mt-24">
            <Card>
              <CardHeader
                title={`Receive at ${transfer.toWarehouseName}`}
                description="Check what arrived. Change a quantity only if less came; serial items arrive in full."
              />
              <ReceiveTransferForm
                lines={transfer.lines}
                toWarehouseName={transfer.toWarehouseName}
                action={receiveTransferAction.bind(null, id)}
              />
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
