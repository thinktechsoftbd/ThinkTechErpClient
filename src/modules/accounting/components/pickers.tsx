import type { ComponentProps } from "react";
import { Select } from "@/core/forms/fields";
import type { LedgerHeadOption, PartyOption } from "../types";

/** "102080001-Dutch-Bangla Bank/Cash at Bank/Cash & Bank/CURRENT ASSET/ASSETS": sub class, then the classes above it. */
export function ledgerHeadLabel(head: Pick<LedgerHeadOption, "code" | "name" | "path">) {
  return `${head.code}-${head.name}${head.path ? `/${head.path}` : ""}`;
}

/** "Rahim Traders (S-00001)"; says when the party is on both sides or inactive. */
export function partyLabel(party: PartyOption) {
  const both = party.isSupplier && party.isCustomer ? " · supplier & customer" : "";
  return `${party.name} (${party.code})${both}${party.isActive ? "" : " · inactive"}`;
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
