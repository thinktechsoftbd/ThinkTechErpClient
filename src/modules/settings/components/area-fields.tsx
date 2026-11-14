import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import {
  AREA_NAME_MAX_LENGTH,
  AREA_TYPES,
  type Area,
  type DistrictOption,
  type ShippingZoneOption,
} from "../types";

/**
 * Fields of the add/edit area modal. A district has a zone of its own; leaving the area's zone empty
 * uses it, so the two are only different where an area overrides its district (e.g. Savar).
 */
export function AreaFields({
  value,
  districts,
  zones,
  defaultDistrictId,
}: {
  value?: Area;
  districts: DistrictOption[];
  zones: ShippingZoneOption[];
  /** Pre-selected district when adding (the list's current district filter). */
  defaultDistrictId?: number;
}) {
  const selectedDistrict = value?.districtId ?? defaultDistrictId;

  return (
    <>
      <Field label="District" name="districtId" required>
        <Select id="districtId" name="districtId" defaultValue={selectedDistrict ? String(selectedDistrict) : ""} required>
          <option value="" disabled>
            Choose a district
          </option>
          {districts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.divisionName}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required hint="Unique within its district.">
          <Input id="name" name="name" maxLength={AREA_NAME_MAX_LENGTH} defaultValue={value?.name} required />
        </Field>
        <Field label="Name (Bangla)" name="nameBn">
          <Input id="nameBn" name="nameBn" maxLength={AREA_NAME_MAX_LENGTH} defaultValue={value?.nameBn ?? ""} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Area type" name="areaType" required>
          <Select id="areaType" name="areaType" defaultValue={value?.areaType ?? "upazila"} required>
            {AREA_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Shipping zone" name="shippingZoneId" hint="Empty keeps the district's own zone.">
          <Select id="shippingZoneId" name="shippingZoneId" defaultValue={value?.shippingZoneId ? String(value.shippingZoneId) : ""}>
            <option value="">Same as district</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be chosen as a delivery area)" />
    </>
  );
}
