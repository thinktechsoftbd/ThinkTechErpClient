import type { ComponentProps } from "react";
import { Select } from "@/core/forms/fields";
import type { LedgerHeadOption, PartyOption } from "../types";

/** "102080001-Dutch-Bangla Bank/Cash at Bank/Cash & Bank/CURRENT ASSET/ASSETS": sub class, then the classes above it. */
export function ledgerHeadLabel(head: Pick<LedgerHeadOption, "code" | "name" | "path">) {
  return `${head.code}-${head.name}${head.path ? `/${head.path}` : ""}`;
}

/** The ledger head mapped to a category or supplier (its acc_sub_class_id), with the head's code, name and path. */
type MappedHead = {
  accSubClassId: number | null;
  ledgerHeadCode: string | null;
  ledgerHeadName: string | null;
  ledgerHeadPath: string | null;
};

/** A category's or supplier's mapped head as the ledger head picker takes it; null when none is mapped. */
export function mappedLedgerHead(row: MappedHead): LedgerHeadOption | null {
  return row.accSubClassId
    ? { id: row.accSubClassId, code: row.ledgerHeadCode ?? "", name: row.ledgerHeadName ?? "", nature: "", path: row.ledgerHeadPath }
    : null;
}

/** A list cell's mapped head: code-name, with the classes above it on hover; a dash when none is mapped. */
export function MappedLedgerHead({ row }: { row: MappedHead }) {
  const head = mappedLedgerHead(row);
  if (!head) return <span className="text-gray-500 dark:text-gray-400">—</span>;
  return (
    <span title={ledgerHeadLabel(head)} className="block max-w-56 truncate">
      <span className="font-mono text-xs text-gray-600 dark:text-gray-300">{head.code}</span>
      <span className="text-gray-800 dark:text-white/90">-{head.name}</span>
    </span>
  );
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
