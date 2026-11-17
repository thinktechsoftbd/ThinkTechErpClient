import Link from "next/link";
import { Wrench } from "lucide-react";
import { rowAction } from "@/core/crud/row-action";
import { Badge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatQuantity } from "@/core/utils/number";
import type { WarrantyCard } from "../types";
import { CoverageBadge } from "./status";

const muted = "text-gray-500 dark:text-gray-400";
const isCovered = (card: WarrantyCard) => card.coverage === "InWarranty" || card.coverage === "InReplacement";

/** Warranty cards with what each covers today; "Open job" starts a job from the card. */
export function CardsTable({ rows, canManage }: { rows: WarrantyCard[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Card</TH>
          <TH>Product / unit</TH>
          <TH>Customer</TH>
          <TH>Sold</TH>
          <TH>Warranty to</TH>
          <TH>Today</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((card) => (
          <TR key={card.id}>
            <TD className="whitespace-nowrap">
              <Link href={`/warranty/service/cards/${card.id}`} className="font-medium text-brand-500 hover:underline">
                {card.warrantyNo}
              </Link>
              <span className={`block text-xs ${muted}`}>
                {card.source === "Sale" ? card.invoiceNo : card.source === "Replacement" ? `Replaces ${card.replacesWarrantyNo}` : "Manual"}
              </span>
            </TD>
            <TD>
              <span className="text-gray-800 dark:text-white/90">{card.productName}</span>
              <span className={`block text-xs ${muted}`}>{card.serialNo ? `SN ${card.serialNo}` : `${formatQuantity(card.quantity)} unit(s)`}</span>
            </TD>
            <TD>
              <span className="text-gray-800 dark:text-white/90">{card.customerName ?? "Walk-in"}</span>
              {card.customerMobile && <span className={`block text-xs ${muted}`}>{card.customerMobile}</span>}
            </TD>
            <TD className="whitespace-nowrap">{formatDate(card.startDate)}</TD>
            <TD className="whitespace-nowrap">
              {formatDate(card.endDate)}
              {card.replacementEndDate && <span className={`block text-xs ${muted}`}>Replace to {formatDate(card.replacementEndDate)}</span>}
            </TD>
            <TD>
              <CoverageBadge coverage={card.coverage} />
              {isCovered(card) && <span className={`block text-xs ${muted}`}>{formatNumber(card.daysRemaining)} day(s) left</span>}
              {card.jobCount > 0 && (
                <span className="mt-1 block">
                  <Badge>{card.jobCount} job(s)</Badge>
                </span>
              )}
            </TD>
            {canManage && (
              <TD className="text-right">
                {card.status === "Active" && (
                  <Link href={`/warranty/service/jobs/new?card=${card.id}&type=${isCovered(card) ? "Warranty" : "Paid"}`} className={rowAction(isCovered(card) ? "positive" : "neutral")}>
                    <Wrench className="size-4" aria-hidden /> {isCovered(card) ? "Warranty job" : "Paid job"}
                  </Link>
                )}
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
