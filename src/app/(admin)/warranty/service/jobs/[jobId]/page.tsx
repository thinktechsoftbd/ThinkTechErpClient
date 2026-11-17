import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CheckCheck, PackageCheck, Pencil, ReceiptText, RefreshCw, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts } from "@/core/documents/facts";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { PageSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { inventoryApi } from "@/modules/inventory/api";
import { canManageWarranty } from "@/modules/warranty/access";
import { createClaimAction } from "@/modules/warranty/actions/claims";
import {
  billJobAction,
  cancelJobAction,
  changeJobStatusAction,
  deleteJobAction,
  deliverJobAction,
  jobApprovalAction,
  saveJobItemsAction,
} from "@/modules/warranty/actions/jobs";
import { warrantyApi } from "@/modules/warranty/api";
import { ClaimsTable } from "@/modules/warranty/components/claims-table";
import {
  ApprovalFields,
  BillFields,
  DeliverFields,
  JobClaimFields,
  ReasonFields,
  StatusFields,
} from "@/modules/warranty/components/job-action-fields";
import { JobItemsEditor } from "@/modules/warranty/components/job-items-editor";
import { CoverageBadge, JobStatusBadge, JobTypeBadge } from "@/modules/warranty/components/status";
import { getSupplierOptions } from "@/modules/warranty/queries";
import { deviceLabel, partyLabel, warrantyLabel, type ServiceJob } from "@/modules/warranty/types";

export const metadata: Metadata = { title: "Service job" };

type Props = PageProps<"/warranty/service/jobs/[jobId]">;

const muted = "text-gray-500 dark:text-gray-400";
const icon = (Icon: typeof Pencil) => <Icon className="size-4" aria-hidden />;

export default function JobPage({ params }: Props) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <JobDetail params={params} />
    </Suspense>
  );
}

async function JobDetail({ params }: Pick<Props, "params">) {
  const id = parseIdParam((await params).jobId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => warrantyApi.jobs.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return <Card><ApiErrorState error={result.error} /></Card>;
  }

  const job = result.data;
  const canManage = canManageWarranty(session);
  const open = job.status !== "Delivered" && job.status !== "Cancelled";
  const billed = job.salesInvoiceId !== null && job.invoiceStatus !== "Cancelled";
  const editableItems = canManage && open && !billed;
  const [lineProducts, suppliers] = await Promise.all([
    editableItems ? tryApi(() => inventoryApi.getLineProducts(job.items.map((item) => item.productId))) : Promise.resolve(null),
    canManage && open ? getSupplierOptions() : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {job.jobNo} <JobStatusBadge status={job.status} /> <JobTypeBadge jobType={job.jobType} />
            {job.priority === "Urgent" && <Badge tone="error">Urgent</Badge>}
          </span>
        }
        description={`${deviceLabel(job)} · ${partyLabel(job)} · received ${formatDateTime(job.receivedAt)}`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty/service" }, { label: job.jobNo }]}
        actions={canManage && <JobActions job={job} open={open} billed={billed} suppliers={suppliers?.ok ? suppliers.data : []} />}
      />

      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                {
                  label: "Customer",
                  value: job.customerId ? (
                    <span>
                      {job.customerName} <span className={muted}>({job.customerCode})</span>
                    </span>
                  ) : (
                    `${job.customerName ?? "Walk-in"} (walk-in)`
                  ),
                },
                { label: "Mobile", value: job.customerMobile },
                { label: "Where", value: job.serviceLocation === "OnSite" ? `On site: ${job.serviceAddress}` : null },
                { label: "Device", value: `${job.deviceType}${job.brandName || job.modelName ? ` · ${[job.brandName, job.modelName].filter(Boolean).join(" ")}` : ""}` },
                { label: "Product", value: job.productName ? `${job.productName} (${job.productCode})` : null },
                { label: "Serial no.", value: job.serialNo },
                {
                  label: "Warranty card",
                  value: job.warrantyRegistrationId ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <Link href={`/warranty/service/cards/${job.warrantyRegistrationId}`} className="text-brand-500 hover:underline">
                        {job.warrantyNo}
                      </Link>
                      <CoverageBadge coverage={job.warrantyCoverage} />
                      {job.warrantyEndDate && <span className={muted}>to {formatDate(job.warrantyEndDate)}</span>}
                    </span>
                  ) : null,
                },
                { label: "Warranty doesn't apply", value: job.warrantyVoidReason },
                { label: "Accessories", value: job.accessoriesReceived },
                { label: "Condition", value: job.physicalCondition },
                { label: "Problem", value: job.problemDescription },
                { label: "Diagnosis", value: job.diagnosis },
                { label: "Technician", value: job.technicianName },
                { label: "Estimate", value: job.estimatedAmount > 0 ? `${formatAmount(job.estimatedAmount)} · ${warrantyLabel(job.approvalStatus)}` : null },
                { label: "Promised for", value: job.promisedDate ? formatDate(job.promisedDate) : null },
                { label: "How it ended", value: job.resolution ? warrantyLabel(job.resolution) : null },
                { label: "Work done", value: job.resolutionNote },
                {
                  label: "Invoice",
                  value: job.salesInvoiceId ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <Link href={`/sales/invoices/${job.salesInvoiceId}`} className="text-brand-500 hover:underline">
                        {job.invoiceNo}
                      </Link>
                      <DocumentStatusBadge status={job.invoiceStatus} />
                      <span className={muted}>
                        {formatAmount(job.invoiceTotal)}
                        {job.invoiceDue ? ` · due ${formatAmount(job.invoiceDue)}` : ""}
                      </span>
                    </span>
                  ) : null,
                },
                { label: "Delivered", value: job.deliveredAt ? `${formatDateTime(job.deliveredAt)}${job.deliveredToName ? ` to ${job.deliveredToName}` : ""}` : null },
                { label: "Cancelled because", value: job.cancelReason },
                { label: "Remarks", value: job.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Parts & charges (${job.items.length})`}
            description={
              billed
                ? "Billed: cancel or delete the invoice in Sales to change the items."
                : job.jobType === "Warranty"
                  ? "Free lines are covered by the warranty. A replacement unit of the same product carries the old card's warranty."
                  : undefined
            }
          />
          {editableItems ? (
            <JobItemsEditor
              action={saveJobItemsAction.bind(null, id)}
              items={job.items}
              products={lineProducts?.ok ? lineProducts.data : []}
              warrantyJob={job.jobType === "Warranty"}
            />
          ) : job.items.length === 0 ? (
            <CardBody>
              <p className={`text-sm ${muted}`}>No parts or charges.</p>
            </CardBody>
          ) : (
            <ItemsTable job={job} />
          )}
        </Card>

        {job.claims.length > 0 && (
          <Card>
            <CardHeader title={`Supplier claims (${job.claims.length})`} />
            <ClaimsTable rows={job.claims} canManage={canManage} showJob={false} />
          </Card>
        )}

        <Card>
          <CardHeader title="Timeline" />
          <CardBody>
            <ol className="space-y-4">
              {[...job.history].reverse().map((change) => (
                <li key={change.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" aria-hidden />
                  <div className="min-w-0 text-sm">
                    <p className="text-gray-800 dark:text-white/90">
                      {change.fromStatus && change.fromStatus !== change.toStatus ? (
                        <>
                          {warrantyLabel(change.fromStatus)} → <span className="font-medium">{warrantyLabel(change.toStatus)}</span>
                        </>
                      ) : (
                        <span className="font-medium">{warrantyLabel(change.toStatus)}</span>
                      )}
                      {change.customerNotified && <span className="ml-2"><Badge tone="success">Customer told</Badge></span>}
                    </p>
                    {change.note && <p className="text-gray-600 dark:text-gray-400">{change.note}</p>}
                    <p className={`text-xs ${muted}`}>
                      {formatDateTime(change.changedAt)}
                      {change.changedByName && ` · ${change.changedByName}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function JobActions({ job, open, billed, suppliers }: { job: ServiceJob; open: boolean; billed: boolean; suppliers: { id: number; code: string; name: string; mobile: string | null; isActive: boolean }[] }) {
  const id = job.id;
  return (
    <div className="flex flex-wrap items-start gap-2">
      {open && (
        <LinkButton href={`/warranty/service/jobs/${id}/edit`} variant="outline" size="sm">
          {icon(Pencil)} Edit
        </LinkButton>
      )}
      {open && (
        <FormModalButton mode="create" variant="outline" buttonSize="sm" icon={icon(RefreshCw)} label="Update status" title={`${job.jobNo}: update status`} action={changeJobStatusAction.bind(null, id)} submitLabel="Update">
          <StatusFields job={job} />
        </FormModalButton>
      )}
      {open && job.status === "AwaitingApproval" && (
        <>
          <FormModalButton mode="create" buttonSize="sm" icon={icon(ThumbsUp)} label="Approved" title="The customer approves the estimate" action={jobApprovalAction.bind(null, id, true)} submitLabel="Approve">
            <ApprovalFields job={job} />
          </FormModalButton>
          <FormModalButton mode="create" variant="outline" buttonSize="sm" icon={icon(ThumbsDown)} label="Declined" title="The customer declines the estimate" action={jobApprovalAction.bind(null, id, false)} submitLabel="Record">
            <ApprovalFields job={job} />
          </FormModalButton>
        </>
      )}
      {open && !billed && job.itemCount > 0 && (
        <FormModalButton mode="create" buttonSize="sm" icon={icon(ReceiptText)} label="Bill job" title={`Bill ${job.jobNo}`} action={billJobAction.bind(null, id)} submitLabel="Make invoice">
          <BillFields job={job} />
        </FormModalButton>
      )}
      {job.salesInvoiceId && (
        <LinkButton href={`/sales/invoices/${job.salesInvoiceId}`} variant="outline" size="sm">
          {icon(ReceiptText)} {job.invoiceNo}
        </LinkButton>
      )}
      {job.status === "Ready" && (
        <FormModalButton mode="create" buttonSize="sm" icon={icon(CheckCheck)} label="Deliver" title={`Deliver ${job.jobNo}`} action={deliverJobAction.bind(null, id)} submitLabel="Delivered">
          <DeliverFields />
        </FormModalButton>
      )}
      {open && (
        <FormModalButton mode="create" variant="outline" buttonSize="sm" icon={icon(Send)} label="Send to supplier" title="Send the unit to the supplier" action={createClaimAction.bind(null, id)} submitLabel="Record claim" size="lg">
          <JobClaimFields job={job} suppliers={suppliers} />
        </FormModalButton>
      )}
      {open && !billed && (
        <FormModalButton mode="create" variant="danger" buttonSize="sm" icon={icon(Ban)} label="Cancel job" title={`Cancel ${job.jobNo}`} action={cancelJobAction.bind(null, id)} submitLabel="Cancel job">
          <ReasonFields label="Why" hint="e.g. the customer took the device back without repair." />
        </FormModalButton>
      )}
      {job.status === "Received" && !job.salesInvoiceId && (
        <DocumentActionButton action={deleteJobAction.bind(null, id)} variant="ghost" confirmMessage={`Delete ${job.jobNo}? Only for a job opened by mistake.`}>
          Delete
        </DocumentActionButton>
      )}
      {!open && (
        <LinkButton href="/warranty/service/jobs/new" size="sm">
          {icon(PackageCheck)} New job
        </LinkButton>
      )}
    </div>
  );
}

function ItemsTable({ job }: { job: ServiceJob }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          <TH>Item</TH>
          <TH className="text-right">Qty</TH>
          <TH className="text-right">Price</TH>
          <TH className="text-right">Discount</TH>
          <TH className="text-right">Total</TH>
        </tr>
      </THead>
      <TBody>
        {job.items.map((item) => (
          <TR key={item.id}>
            <TD className={muted}>{item.lineNo}</TD>
            <TD>
              <span className="text-gray-800 dark:text-white/90">{item.productName}</span>
              {item.isWarrantyCovered && (
                <span className="ml-2">
                  <Badge tone="success">Warranty</Badge>
                </span>
              )}
              <span className={`block text-xs ${muted}`}>
                {item.productCode}
                {item.serialNo && ` · SN ${item.serialNo}`}
                {item.description && ` · ${item.description}`}
              </span>
            </TD>
            <TD className="text-right tabular-nums">
              {formatQuantity(item.quantity)} {item.unitCode}
            </TD>
            <TD className="text-right tabular-nums">{formatAmount(item.unitPrice)}</TD>
            <TD className="text-right tabular-nums">{item.discountAmount ? formatAmount(item.discountAmount) : ""}</TD>
            <TD className="text-right tabular-nums">{formatAmount(item.lineTotal)}</TD>
          </TR>
        ))}
        <TR>
          <TD colSpan={5} className="text-right font-medium">
            Customer pays (before tax)
          </TD>
          <TD className="text-right font-semibold tabular-nums">{formatAmount(job.itemsTotal)}</TD>
        </TR>
      </TBody>
    </Table>
  );
}
