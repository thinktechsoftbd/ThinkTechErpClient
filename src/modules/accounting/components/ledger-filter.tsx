import { ReportField } from "@/modules/inventory/components/reports/report-filters";
import type { LedgerHeadOption, PartyOption } from "../types";
import { LedgerHeadSelect, PartySelect } from "./pickers";

/** The subsidiary ledger's head filter (?account=) and optional supplier or customer filter (?party=). */
export function LedgerHeadPartyFilter({
  heads,
  parties,
  accountId,
  partyId,
}: {
  heads: LedgerHeadOption[];
  parties: PartyOption[];
  accountId?: number;
  partyId?: number;
}) {
  return (
    <>
      <ReportField label="Ledger head" className="w-full sm:w-80">
        <LedgerHeadSelect
          name="account"
          heads={heads}
          defaultValue={accountId ? String(accountId) : ""}
          placeholder="Choose a ledger head"
          className="h-9"
        />
      </ReportField>
      <ReportField label="Supplier / customer" className="w-full sm:w-64">
        <PartySelect
          name="party"
          parties={parties}
          placeholder="All parties"
          defaultValue={partyId ? String(partyId) : ""}
          className="h-9"
        />
      </ReportField>
    </>
  );
}
