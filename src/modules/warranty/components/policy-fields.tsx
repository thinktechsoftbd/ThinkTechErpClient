import { Checkbox, Field, Input, Textarea } from "@/core/forms/fields";
import type { WarrantyPolicy } from "../types";

/** Fields of the add/edit warranty policy modal. */
export function PolicyFields({ value }: { value?: WarrantyPolicy }) {
  return (
    <>
      <Field label="Name" name="name" required hint='As printed on the card, e.g. "1 Year Warranty" or "3 Years (7 Days Replacement)".'>
        <Input id="name" name="name" maxLength={150} defaultValue={value?.name} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Warranty (months)" name="warrantyMonths" required hint="Faults are repaired free for this long.">
          <Input id="warrantyMonths" name="warrantyMonths" inputMode="numeric" defaultValue={value?.warrantyMonths ?? 12} required />
        </Field>
        <Field label="Replacement (days)" name="replacementDays" hint="The first days in which a faulty unit is replaced. 0: none.">
          <Input id="replacementDays" name="replacementDays" inputMode="numeric" defaultValue={value?.replacementDays ?? 0} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-6">
        <Checkbox name="coversParts" defaultChecked={value?.coversParts ?? true} label="Covers parts" />
        <Checkbox name="coversLabor" defaultChecked={value?.coversLabor ?? true} label="Covers service charge" />
      </div>
      <Field label="Terms" name="terms" hint="Printed on the card, e.g. physical, burn and liquid damage are not covered.">
        <Textarea id="terms" name="terms" maxLength={2000} rows={3} defaultValue={value?.terms ?? ""} />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be given to products)" />
    </>
  );
}
