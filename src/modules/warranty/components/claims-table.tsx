import Link from "next/link";
import { Undo2 } from "lucide-react";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { cancelClaimAction, returnClaimAction } from "../actions/claims";
import type { SupplierClaim } from "../types";
import { ClaimReturnFields } from "./job-action-fields";
import { ClaimStatusBadge } from "./status";

const muted = "text-gray-500 dark:text-gray-400";

/** Units sent to suppliers: where they are and what came back. */
export function ClaimsTable({ rows, canManage, showJob = true }: { rows: SupplierClaim[]; canManage: boolean; showJob?: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Claim</TH>
          <TH>Supplier</TH>
          <TH>Unit</TH>
          {showJob && <TH>Job</TH>}
          <TH>Status</TH>
          <TH className="text-right">Days</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((claim) => (
          <TR key={claim.id}>
            <TD className="whitespace-nowrap">
              <span className="font-medium text-gray-800 dark:text-white/90">{claim.claimNo}</span>
              <span className={`block text-xs ${muted}`}>
                Sent {formatDate(claim.sentDate)}
                {claim.supplierReferenceNo && ` · ${claim.supplierReferenceNo}`}
              </span>
            </TD>
            <TD>{claim.supplierName}</TD>
            <TD>
              <span className="text-gray-800 dark:text-white/90">{claim.productName}</span>
              <span className={`block text-xs ${muted}`}>
                {claim.serialNo ? `SN ${claim.serialNo}` : claim.productCode}
                {claim.replacementSerialNo && ` → SN ${claim.replacementSerialNo}`}
              </span>
            </TD>
            {showJob && (
              <TD>
                {claim.serviceJobId ? (
                  <Link href={`/warranty/service/jobs/${claim.serviceJobId}`} className="text-brand-500 hover:underline">
                    {claim.jobNo}
                  </Link>
                ) : (
                  <span className={muted}>Stock</span>
                )}
              </TD>
            )}
            <TD>
              <ClaimStatusBadge status={claim.status} />
              {claim.outcome && (
                <span className={`block text-xs ${muted}`}>
                  {claim.outcome}
                  {claim.returnedDate && ` · ${formatDate(claim.returnedDate)}`}
                  {claim.serviceChargeAmount > 0 && ` · charge ${formatAmount(claim.serviceChargeAmount)}`}
                </span>
              )}
            </TD>
            <TD className="text-right tabular-nums">{claim.daysOut}</TD>
            {canManage && (
              <TD className="text-right">
                {claim.status === "Sent" && (
                  <span className="inline-flex items-start gap-1">
                    <FormModalButton
                      mode="edit"
                      tone="positive"
                      icon={<Undo2 className="size-4" aria-hidden />}
                      label="Back"
                      title={`${claim.claimNo}: back from the supplier`}
                      action={returnClaimAction.bind(null, claim.id)}
                      submitLabel="Record return"
                    >
                      <ClaimReturnFields />
                    </FormModalButton>
                    <DocumentActionButton action={cancelClaimAction.bind(null, claim.id)} variant="ghost" confirmMessage={`Cancel claim ${claim.claimNo}?`}>
                      Cancel
                    </DocumentActionButton>
                  </span>
                )}
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
