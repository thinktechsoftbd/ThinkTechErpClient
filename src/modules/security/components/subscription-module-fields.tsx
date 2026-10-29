import { Checkbox, Field, Input, Textarea } from "@/core/forms/fields";
import type { SubscriptionModule } from "../types";

/** Fields of the add/edit subscription module modal. */
export function SubscriptionModuleFields({ value }: { value?: SubscriptionModule }) {
  return (
    <>
      <Field label="Module name" name="moduleName" required hint="What an organization subscribes to, e.g. SMS or Inventory. Must be unique.">
        <Input id="moduleName" name="moduleName" maxLength={200} defaultValue={value?.moduleName} required />
      </Field>
      <Field label="Remarks" name="remarks">
        <Textarea id="remarks" name="remarks" rows={3} maxLength={1000} defaultValue={value?.remarks ?? ""} />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be chosen for new subscriptions)" />
    </>
  );
}
