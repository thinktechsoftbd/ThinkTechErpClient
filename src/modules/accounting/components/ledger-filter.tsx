import { ReportField } from "@/modules/inventory/components/reports/report-filters";
import type { LedgerHeadOption, PartyOption } from "../types";
import { LedgerHeadField } from "./ledger-head-picker";
import { PartySelect } from "./pickers";

/** The subsidiary ledger's head filter (?account=) and optional supplier or customer filter (?party=). */
export function LedgerHeadPartyFilter({
  head,
  parties,
  partyId,
}: {
  /** The head in the URL, if it still exists. */
  head: LedgerHeadOption | null;
  parties: PartyOption[];
  partyId?: number;
}) {
  return (
    <>
      <ReportField label="Ledger head" className="w-full sm:w-80">
        {/* Keyed by the head in the URL, so clearing the filters clears the field too. */}
        <LedgerHeadField
          key={head?.id ?? "none"}
          name="account"
          defaultValue={head}
          aria-label="Ledger head"
          placeholder="Search a ledger head…"
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
