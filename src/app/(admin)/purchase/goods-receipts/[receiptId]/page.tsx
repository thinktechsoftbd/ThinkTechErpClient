import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts, TotalsList } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount, round } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManagePurchase } from "@/modules/purchase/access";
import { cancelReceiptAction, deleteReceiptAction, postReceiptAction } from "@/modules/purchase/actions/receipts";
import { purchaseApi } from "@/modules/purchase/api";
import { PurchaseLinesTable } from "@/modules/purchase/components/purchase-lines-table";

export const metadata: Metadata = { title: "Goods Receipt" };

type Props = PageProps<"/purchase/goods-receipts/[receiptId]">;

export default function GoodsReceiptPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReceiptDetail params={params} />
    </Suspense>
  );
}

async function ReceiptDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).receiptId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => purchaseApi.receipts.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const receipt = result.data;
  const canManage = canManagePurchase(session);
  const money = (value: number) => `${formatAmount(value)} ${receipt.currency}`;
  const isDraft = receipt.status === "Draft";
  const isPosted = receipt.status === "Posted";
  const goodsValue = round(receipt.lines.reduce((sum, line) => sum + line.lineTotal, 0), 2);
  const chargesValue = round(receipt.charges.reduce((sum, charge) => sum + charge.amount, 0), 2);
  const anyBilled = receipt.lines.some((line) => line.invoicedQuantity > 0);
  const anyReturned = receipt.lines.some((line) => line.returnedQuantity > 0);
  const canReturn = isPosted && receipt.lines.some((line) => line.productType === "Stock" && line.quantity - line.returnedQuantity > 0);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {receipt.receiptNo} <DocumentStatusBadge status={receipt.status} />
            {isPosted && (receipt.isFullyInvoiced ? <Badge tone="success">Billed</Badge> : <Badge tone="warning">To bill</Badge>)}
          </span>
        }
        description={`Goods from ${receipt.supplierName ?? "a supplier"} into ${receipt.warehouseName} · ${formatDate(receipt.receiptDate)}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Purchase", href: "/purchase" },
          { label: "Goods Receipts", href: "/purchase/goods-receipts" },
          { label: receipt.receiptNo },
        ]}
        actions={
          canManage && (
            <div className="flex flex-wrap items-start gap-2">
              {isDraft && (
                <>
                  <LinkButton href={`/purchase/goods-receipts/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={postReceiptAction.bind(null, id)}
                    variant="primary"
                    confirmMessage="Post this receipt? The stock comes in. Posted receipts can't be edited."
                  >
                    Post
                  </DocumentActionButton>
                  <DocumentActionButton action={deleteReceiptAction.bind(null, id)} variant="danger" confirmMessage="Delete this draft receipt?">
                    Delete
                  </DocumentActionButton>
                </>
              )}
              {isPosted && !receipt.isFullyInvoiced && (
                <LinkButton href={`/purchase/invoices/new?receiptId=${id}`} size="sm">
                  Bill this receipt
                </LinkButton>
              )}
              {canReturn && (
                <LinkButton href={`/purchase/returns/new?receiptId=${id}`} variant="outline" size="sm">
                  Return goods
                </LinkButton>
              )}
              {isPosted && !anyBilled && !anyReturned && (
                <DocumentActionButton
                  action={cancelReceiptAction.bind(null, id)}
                  variant="danger"
                  confirmMessage="Cancel this posted receipt? Its stock goes back out."
                >
                  Cancel receipt
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
                { label: "Supplier", value: receipt.supplierName },
                { label: "Receipt date", value: formatDate(receipt.receiptDate) },
                { label: "Warehouse", value: receipt.warehouseName },
                {
                  label: "Purchase order",
                  value: receipt.purchaseOrderId ? (
                    <Link href={`/purchase/orders/${receipt.purchaseOrderId}`} className="text-brand-500 hover:underline">
                      {receipt.purchaseOrderNo}
                    </Link>
                  ) : null,
                },
                {
                  label: "Supplier's challan",
                  value: [receipt.supplierChallanNo, receipt.supplierChallanDate && formatDate(receipt.supplierChallanDate)].filter(Boolean).join(" · "),
                },
                { label: "Currency", value: receipt.exchangeRate !== 1 ? `${receipt.currency} at ${receipt.exchangeRate}` : receipt.currency },
                {
                  label: "Billing",
                  value: !isPosted
                    ? null
                    : receipt.isFullyInvoiced
                      ? "Fully billed"
                      : anyBilled
                        ? "Partly billed: the rest is still to bill"
                        : "Not billed yet",
                },
                { label: "Posted", value: receipt.postedAt ? formatDateTime(receipt.postedAt) : null },
                { label: "Remarks", value: receipt.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Items (${receipt.lines.length})`}
            description="Landed cost per base unit includes the charges below. Tax is entered on the supplier's bill."
          />
          <PurchaseLinesTable lines={receipt.lines} mode="receipt" showTax={false} showLandedCost />
          <CardBody>
            <TotalsList
              rows={[
                { label: "Goods", value: money(goodsValue) },
                { label: "Landed charges", value: money(chargesValue), hidden: chargesValue === 0 },
                {
                  label: receipt.exchangeRate !== 1 ? "Landed value (base currency)" : "Landed value",
                  value: receipt.exchangeRate !== 1 ? formatAmount(receipt.totalValue) : money(receipt.totalValue),
                  strong: true,
                },
              ]}
            />
          </CardBody>
        </Card>

        {receipt.charges.length > 0 && (
          <Card>
            <CardHeader title="Landed charges" description="Spread over the stock lines' cost." />
            <Table>
              <THead>
                <tr>
                  <TH>Charge</TH>
                  <TH>Spread by</TH>
                  <TH>Paid to</TH>
                  <TH className="text-right">Amount</TH>
                </tr>
              </THead>
              <TBody>
                {receipt.charges.map((charge) => (
                  <TR key={charge.id}>
                    <TD>{charge.chargeName}</TD>
                    <TD>{charge.allocationMethod === "Quantity" ? "Quantity" : "Line value"}</TD>
                    <TD>{charge.onSupplierBill ? "On the supplier's bill" : (charge.payeeName ?? "Paid separately")}</TD>
                    <TD className="text-right tabular-nums">{money(charge.amount)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}
