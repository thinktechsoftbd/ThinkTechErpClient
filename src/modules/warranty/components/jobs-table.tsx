import Link from "next/link";
import { Badge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { deviceLabel, type ServiceJob } from "../types";
import { JobStatusBadge, JobTypeBadge } from "./status";

const muted = "text-gray-500 dark:text-gray-400";

/** Service jobs, newest first: who, what device, warranty or paid, where it stands. */
export function JobsTable({ rows }: { rows: ServiceJob[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Job</TH>
          <TH>Customer</TH>
          <TH>Device</TH>
          <TH>Type</TH>
          <TH>Technician</TH>
          <TH>Status</TH>
          <TH className="text-right">Bill</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((job) => (
          <TR key={job.id}>
            <TD className="whitespace-nowrap">
              <Link href={`/warranty/service/jobs/${job.id}`} className="font-medium text-brand-500 hover:underline">
                {job.jobNo}
              </Link>
              {job.priority === "Urgent" && (
                <span className="ml-2">
                  <Badge tone="error">Urgent</Badge>
                </span>
              )}
              <span className={`block text-xs ${muted}`}>{formatDateTime(job.receivedAt)}</span>
            </TD>
            <TD>
              <span className="text-gray-800 dark:text-white/90">{job.customerName ?? "Walk-in"}</span>
              {job.customerMobile && <span className={`block text-xs ${muted}`}>{job.customerMobile}</span>}
            </TD>
            <TD>
              <span className="text-gray-800 dark:text-white/90">{deviceLabel(job)}</span>
              <span className={`block text-xs ${muted}`}>
                {job.deviceType}
                {job.serialNo && ` · SN ${job.serialNo}`}
              </span>
            </TD>
            <TD>
              <JobTypeBadge jobType={job.jobType} />
              {job.warrantyNo && <span className={`block text-xs ${muted}`}>{job.warrantyNo}</span>}
            </TD>
            <TD className={muted}>{job.technicianName ?? "—"}</TD>
            <TD>
              <JobStatusBadge status={job.status} />
              {job.promisedDate && !["Delivered", "Cancelled"].includes(job.status) && (
                <span className={`block text-xs ${muted}`}>Promised {formatDate(job.promisedDate)}</span>
              )}
            </TD>
            <TD className="text-right whitespace-nowrap tabular-nums">
              {job.invoiceNo ? (
                <>
                  {formatAmount(job.invoiceTotal)}
                  <span className={`block text-xs ${muted}`}>
                    {job.invoiceNo}
                    {job.invoiceStatus === "Draft" ? " (draft)" : job.invoiceStatus === "Cancelled" ? " (cancelled)" : ""}
                  </span>
                </>
              ) : job.itemCount > 0 ? (
                <>
                  {formatAmount(job.itemsTotal)}
                  <span className={`block text-xs ${muted}`}>not billed</span>
                </>
              ) : job.estimatedAmount > 0 ? (
                <span className={muted}>Est. {formatAmount(job.estimatedAmount)}</span>
              ) : (
                <span className={muted}>—</span>
              )}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
