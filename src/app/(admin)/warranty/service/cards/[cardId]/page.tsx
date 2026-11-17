import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, Wrench } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Facts } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDate, formatDateTime, formatNumber } from "@/core/utils/format";
import { formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageWarranty } from "@/modules/warranty/access";
import { voidCardAction } from "@/modules/warranty/actions/cards";
import { warrantyApi } from "@/modules/warranty/api";
import { ReasonFields } from "@/modules/warranty/components/job-action-fields";
import { JobsTable } from "@/modules/warranty/components/jobs-table";
import { CoverageBadge } from "@/modules/warranty/components/status";

export const metadata: Metadata = { title: "Warranty card" };

type Props = PageProps<"/warranty/service/cards/[cardId]">;

const muted = "text-gray-500 dark:text-gray-400";

export default function WarrantyCardPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CardDetail params={params} />
    </Suspense>
  );
}

async function CardDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).cardId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => warrantyApi.cards.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }
  const card = result.data;
  const covered = card.coverage === "InWarranty" || card.coverage === "InReplacement";
  const canManage = canManageWarranty(session);
  const jobs = card.jobCount > 0 ? await tryApi(() => warrantyApi.cards.check(card.warrantyNo)) : null;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {card.warrantyNo} <CoverageBadge coverage={card.coverage} />
          </span>
        }
        description={`${card.productName}${card.serialNo ? ` · SN ${card.serialNo}` : ""} · ${card.customerName ?? card.customerMobile ?? "walk-in"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Warranty", href: "/warranty/service" },
          { label: "Warranty cards", href: "/warranty/service/cards" },
          { label: card.warrantyNo },
        ]}
        actions={
          canManage &&
          card.status === "Active" && (
            <div className="flex flex-wrap items-start gap-2">
              <LinkButton href={`/warranty/service/jobs/new?card=${card.id}&type=${covered ? "Warranty" : "Paid"}`} size="sm">
                <Wrench className="size-4" aria-hidden /> {covered ? "Open warranty job" : "Open paid job"}
              </LinkButton>
              <FormModalButton
                mode="create"
                variant="danger"
                buttonSize="sm"
                icon={<Ban className="size-4" aria-hidden />}
                label="Void"
                title={`Void ${card.warrantyNo}`}
                description="The unit loses its warranty, e.g. a broken seal or tampering."
                action={voidCardAction.bind(null, card.id)}
                submitLabel="Void card"
              >
                <ReasonFields label="Why" />
              </FormModalButton>
            </div>
          )
        }
      />
      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                { label: "Product", value: `${card.productName} (${card.productCode})${card.brandName ? ` · ${card.brandName}` : ""}` },
                { label: "Serial no.", value: card.serialNo },
                { label: "Units", value: card.serialNo ? null : formatQuantity(card.quantity) },
                { label: "Customer", value: card.customerName ? `${card.customerName}${card.customerCode ? ` (${card.customerCode})` : ""}` : "Walk-in" },
                { label: "Mobile", value: card.customerMobile },
                {
                  label: "Sold",
                  value: (
                    <span>
                      {formatDate(card.startDate)}
                      {card.salesInvoiceId && (
                        <>
                          {" on "}
                          <Link href={`/sales/invoices/${card.salesInvoiceId}`} className="text-brand-500 hover:underline">
                            {card.invoiceNo}
                          </Link>
                        </>
                      )}
                      {card.source === "Manual" && <span className={muted}> (registered by hand)</span>}
                    </span>
                  ),
                },
                { label: "Policy", value: card.warrantyPolicyName },
                { label: "Replacement until", value: card.replacementEndDate ? formatDate(card.replacementEndDate) : null },
                { label: "Warranty until", value: `${formatDate(card.endDate)}${covered ? ` (${formatNumber(card.daysRemaining)} days left)` : ""}` },
                {
                  label: "Covers",
                  value: (
                    <span className="inline-flex gap-1">
                      {card.coversParts && <Badge>Parts</Badge>}
                      {card.coversLabor && <Badge>Service</Badge>}
                    </span>
                  ),
                },
                { label: "Terms", value: card.terms },
                {
                  label: "Replaces",
                  value: card.replacesRegistrationId ? (
                    <Link href={`/warranty/service/cards/${card.replacesRegistrationId}`} className="text-brand-500 hover:underline">
                      {card.replacesWarrantyNo}
                    </Link>
                  ) : null,
                },
                {
                  label: "Replaced by",
                  value: card.replacedByRegistrationId ? (
                    <Link href={`/warranty/service/cards/${card.replacedByRegistrationId}`} className="text-brand-500 hover:underline">
                      {card.replacedByWarrantyNo}
                    </Link>
                  ) : null,
                },
                { label: "Supplier", value: card.supplierName },
                { label: "Supplier's warranty to", value: card.supplierWarrantyEndDate ? formatDate(card.supplierWarrantyEndDate) : null },
                { label: "Void because", value: card.voidReason },
                { label: "Remarks", value: card.remarks },
                { label: "Issued", value: formatDateTime(card.createdAt) },
              ]}
            />
          </CardBody>
        </Card>
        {jobs?.ok && jobs.data.jobs.length > 0 && (
          <Card>
            <CardHeader title={`Service jobs (${jobs.data.jobs.length})`} />
            <JobsTable rows={jobs.data.jobs} />
          </Card>
        )}
      </div>
    </>
  );
}
