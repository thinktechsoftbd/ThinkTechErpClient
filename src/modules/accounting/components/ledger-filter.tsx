"use client";

import { useState } from "react";
import { ReportField } from "@/modules/inventory/components/reports/report-filters";
import type { LedgerHeadOption, PartyOption } from "../types";
import { LedgerHeadSelect, PartySelect } from "./pickers";

/**
 * The subsidiary ledger's head and party filters: a head that keeps a supplier or customer ledger
 * offers its suppliers or customers (sent as ?supplier= or ?customer=).
 */
export function LedgerHeadPartyFilter({
  heads,
  suppliers,
  customers,
  accountId,
  partyId,
}: {
  heads: LedgerHeadOption[];
  suppliers: PartyOption[];
  customers: PartyOption[];
  accountId?: number;
  partyId?: number;
}) {
  const [head, setHead] = useState(accountId ? String(accountId) : "");
  const partyType = heads.find((option) => String(option.id) === head)?.partyType;
  const initialType = heads.find((option) => option.id === accountId)?.partyType;

  return (
    <>
      <ReportField label="Ledger head" className="w-full sm:w-80">
        <LedgerHeadSelect
          name="account"
          heads={heads}
          allowInactive
          value={head}
          onChange={(event) => setHead(event.target.value)}
          placeholder="Choose a ledger head"
          className="h-9"
        />
      </ReportField>
      {partyType && (
        <ReportField label={partyType} className="w-full sm:w-64">
          <PartySelect
            key={partyType}
            name={partyType === "Supplier" ? "supplier" : "customer"}
            parties={partyType === "Supplier" ? suppliers : customers}
            placeholder={`All ${partyType.toLowerCase()}s`}
            defaultValue={partyType === initialType && partyId ? String(partyId) : ""}
            className="h-9"
          />
        </ReportField>
      )}
    </>
  );
}
