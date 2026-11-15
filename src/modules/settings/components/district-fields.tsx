import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import { LOCATION_NAME_MAX_LENGTH, type District, type DistrictZoneOption, type DivisionOption } from "../types";

/** Fields of the add/edit district modal. */
export function DistrictFields({
  value,
  divisions,
  zones,
  defaultDivisionId,
}: {
  value?: District;
  divisions: DivisionOption[];
  zones: DistrictZoneOption[];
  /** Pre-selected division when adding (the list's current division filter). */
  defaultDivisionId?: number;
}) {
  const selectedDivision = value?.divisionId ?? defaultDivisionId;

  return (
    <>
      <Field label="Division" name="divisionId" required>
        <Select id="divisionId" name="divisionId" defaultValue={selectedDivision ? String(selectedDivision) : ""} required>
          <option value="" disabled>
            Choose a division
          </option>
          {divisions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required hint="Unique within its division.">
          <Input id="name" name="name" maxLength={LOCATION_NAME_MAX_LENGTH} defaultValue={value?.name} required />
        </Field>
        <Field label="Name (Bangla)" name="nameBn">
          <Input id="nameBn" name="nameBn" maxLength={LOCATION_NAME_MAX_LENGTH} defaultValue={value?.nameBn ?? ""} />
        </Field>
      </div>
      <Field label="Shipping zone" name="shippingZoneId" hint="Its areas use this zone unless they override it.">
        <Select id="shippingZoneId" name="shippingZoneId" defaultValue={value?.shippingZoneId ? String(value.shippingZoneId) : ""}>
          <option value="">No zone</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
              {zone.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </Select>
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be chosen in addresses and areas)" />
    </>
  );
}
