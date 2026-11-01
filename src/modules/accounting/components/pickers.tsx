import type { ComponentProps } from "react";
import { Select } from "@/core/forms/fields";
import type { LedgerHeadOption, PartyOption } from "../types";

/** "102080001 — Dutch-Bangla Bank". */
export function ledgerHeadLabel(head: Pick<LedgerHeadOption, "code" | "name">) {
  return `${head.code} — ${head.name}`;
}

/** "Rahim Traders (S-00001)"; says when the party is on both sides or inactive. */
export function partyLabel(party: PartyOption) {
  const both = party.isSupplier && party.isCustomer ? " · supplier & customer" : "";
  return `${party.name} (${party.code})${both}${party.isActive ? "" : " · inactive"}`;
}

/** Ledger heads (sub classes) grouped by "Main class › Map class". */
export function LedgerHeadSelect({
  heads,
  placeholder = "Choose a ledger head…",
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  heads: LedgerHeadOption[];
  placeholder?: string;
}) {
  const groups = new Map<string, LedgerHeadOption[]>();
  for (const head of [...heads].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))) {
    const key = head.path ?? "";
    groups.set(key, [...(groups.get(key) ?? []), head]);
  }
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {[...groups.entries()].map(([path, items]) => (
        <optgroup key={path} label={path || "Ledger heads"}>
          {items.map((head) => (
            <option key={head.id} value={head.id}>
              {ledgerHeadLabel(head)}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}

export function PartySelect({
  parties,
  placeholder,
  ...props
}: Omit<ComponentProps<"select">, "children"> & { parties: PartyOption[]; placeholder: string }) {
  return (
    <Select {...props}>
      <option value="">{placeholder}</option>
      {parties.map((party) => (
        <option key={party.id} value={party.id}>
          {partyLabel(party)}
        </option>
      ))}
    </Select>
  );
}
