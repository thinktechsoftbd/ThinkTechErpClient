import { Checkbox, Field, Input } from "@/core/forms/fields";
import { LOCATION_NAME_MAX_LENGTH, type Division } from "../types";

/** Fields of the add/edit division modal. */
export function DivisionFields({ value }: { value?: Division }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required hint="Must be unique, e.g. Dhaka.">
          <Input id="name" name="name" maxLength={LOCATION_NAME_MAX_LENGTH} defaultValue={value?.name} required />
        </Field>
        <Field label="Name (Bangla)" name="nameBn">
          <Input id="nameBn" name="nameBn" maxLength={LOCATION_NAME_MAX_LENGTH} defaultValue={value?.nameBn ?? ""} />
        </Field>
      </div>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (its districts can be chosen)" />
    </>
  );
}
