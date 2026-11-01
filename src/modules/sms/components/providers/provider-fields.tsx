import { Checkbox, Field, Input } from "@/core/forms/fields";
import type { SmsProvider } from "../../types";
import { SecretField } from "./secret-field";

const wide = "sm:col-span-2";

/** Fields of the add/edit provider modal. Secrets are never prefilled. */
export function ProviderFields({ value }: { value?: SmsProvider }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name" name="name" required>
        <Input id="name" name="name" maxLength={150} defaultValue={value?.name} required />
      </Field>
      <Field label="Code" name="code" required hint="Short and unique, e.g. GW1. Saved in capitals.">
        <Input id="code" name="code" maxLength={50} defaultValue={value?.code} className="uppercase" required autoComplete="off" />
      </Field>
      <Field label="API base URL" name="apiBaseUrl" className={wide} hint="The gateway's API address, e.g. https://api.example.com.">
        <Input
          id="apiBaseUrl"
          name="apiBaseUrl"
          type="url"
          maxLength={500}
          defaultValue={value?.apiBaseUrl ?? ""}
          placeholder="https://"
          autoComplete="off"
        />
      </Field>
      <Field label="API username" name="apiUsername">
        <Input id="apiUsername" name="apiUsername" maxLength={150} defaultValue={value?.apiUsername ?? ""} autoComplete="off" />
      </Field>
      <SecretField name="apiPassword" label="API password" maxLength={1000} editing={Boolean(value)} isSet={value?.hasApiPassword ?? false} />
      <SecretField name="apiKey" label="API key" maxLength={2000} editing={Boolean(value)} isSet={value?.hasApiKey ?? false} />
      <Checkbox
        name="isActive"
        defaultChecked={value?.isActive ?? true}
        label="Active (SMS can be bought from it and allocated)"
        className={wide}
      />
    </div>
  );
}
