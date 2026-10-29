import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import { LOOKUP_NAME_MAX_LENGTH, type LookupData, type LookupTable } from "../types";

/** Fields of the add/edit lookup table modal. */
export function LookupTableFields({ value }: { value?: LookupTable }) {
  return (
    <>
      <Field label="Name" name="name" required hint="The list's name, e.g. Currency or Blood Group. Must be unique.">
        <Input id="name" name="name" maxLength={LOOKUP_NAME_MAX_LENGTH} defaultValue={value?.name} required />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (its values appear in drop-downs)" />
    </>
  );
}

/** Fields of the add/edit lookup value modal. */
export function LookupDataFields({
  value,
  tables,
  defaultTableId,
}: {
  value?: LookupData;
  tables: Pick<LookupTable, "id" | "name" | "isActive">[];
  /** Pre-selected table when adding (the list's current table filter). */
  defaultTableId?: number;
}) {
  const selected = value?.lookupTableId ?? defaultTableId;
  return (
    <>
      <Field label="Lookup table" name="lookupTableId" required>
        <Select id="lookupTableId" name="lookupTableId" defaultValue={selected ? String(selected) : ""} required>
          <option value="" disabled>
            Choose a lookup table
          </option>
          {tables.map((table) => (
            <option key={table.id} value={table.id}>
              {table.name}
              {table.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Value" name="name" required hint="Unique within its lookup table, e.g. BDT.">
        <Input id="name" name="name" maxLength={LOOKUP_NAME_MAX_LENGTH} defaultValue={value?.name} required />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (appears in drop-downs)" />
    </>
  );
}
