import type { ComponentProps } from "react";
import { Select } from "@/core/forms/fields";
import type { LedgerHeadOption, PartyOption } from "../types";

/** "110102001 — Bank Account"; an inactive head says so. */
export function ledgerHeadLabel(head: Pick<LedgerHeadOption, "code" | "name" | "isActive">) {
  return `${head.code} — ${head.name}${head.isActive ? "" : " (inactive)"}`;
}

export function partyLabel(party: PartyOption) {
  return `${party.name} (${party.code})${party.isActive ? "" : " · inactive"}`;
}

/** Ledger heads grouped by "Main class › Map class"; inactive ones can be shown but not chosen. */
export function LedgerHeadSelect({
  heads,
  placeholder = "Choose a ledger head…",
  allowInactive = false,
  ...props
}: Omit<ComponentProps<"select">, "children"> & {
  heads: LedgerHeadOption[];
  placeholder?: string;
  /** Reports may look at heads that are no longer ticked. */
  allowInactive?: boolean;
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
            <option key={head.id} value={head.id} disabled={!head.isActive && !allowInactive}>
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
