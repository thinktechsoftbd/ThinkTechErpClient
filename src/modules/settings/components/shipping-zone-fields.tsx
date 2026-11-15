import { Checkbox, Field, Input } from "@/core/forms/fields";
import {
  LOCATION_NAME_MAX_LENGTH,
  SHIPPING_ZONE_CODE_MAX_LENGTH,
  SHIPPING_ZONE_MAX_DELIVERY_DAYS,
  type ShippingZone,
} from "../types";

/** Fields of the add/edit shipping zone modal. */
export function ShippingZoneFields({ value }: { value?: ShippingZone }) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Code" name="code" required hint="Lowercase letters, digits and underscores, e.g. inside_dhaka. Unique.">
          <Input
            id="code"
            name="code"
            maxLength={SHIPPING_ZONE_CODE_MAX_LENGTH}
            defaultValue={value?.code}
            required
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono"
          />
        </Field>
        <Field label="Name" name="name" required hint="e.g. Inside Dhaka.">
          <Input id="name" name="name" maxLength={LOCATION_NAME_MAX_LENGTH} defaultValue={value?.name} required />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Minimum delivery days" name="minDeliveryDays">
          <Input
            id="minDeliveryDays"
            name="minDeliveryDays"
            type="number"
            min={0}
            max={SHIPPING_ZONE_MAX_DELIVERY_DAYS}
            step={1}
            defaultValue={value?.minDeliveryDays ?? ""}
          />
        </Field>
        <Field label="Maximum delivery days" name="maxDeliveryDays">
          <Input
            id="maxDeliveryDays"
            name="maxDeliveryDays"
            type="number"
            min={0}
            max={SHIPPING_ZONE_MAX_DELIVERY_DAYS}
            step={1}
            defaultValue={value?.maxDeliveryDays ?? ""}
          />
        </Field>
      </div>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (districts and areas can use it)" />
    </>
  );
}
