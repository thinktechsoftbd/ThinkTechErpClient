import { Checkbox, Field, Input, Textarea } from "@/core/forms/fields";
import type { OrganizationClient } from "../types";
import { OrganizationClientOrganizationSelect } from "./organization-client-organization-select";

export function OrganizationClientFields({ client }: { client?: OrganizationClient }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="Client name" name="clientName" required>
        <Input
          id="clientName"
          name="clientName"
          maxLength={64}
          defaultValue={client?.clientName ?? ""}
          autoComplete="off"
          required
        />
      </Field>
      <div className="md:col-span-2">
        <OrganizationClientOrganizationSelect
          initialId={client?.orgObjectId ?? null}
          initialName={client?.organizationName ?? null}
        />
      </div>
      <Field label="Acting user ID" name="actingUserId" required hint="The API will act as this user for this client.">
        <Input
          id="actingUserId"
          name="actingUserId"
          type="number"
          min={1}
          step={1}
          defaultValue={client?.actingUserId ?? 1}
          required
        />
      </Field>
      <Field
        label="Secret SHA-256 hash"
        name="secretSha256Hash"
        className="md:col-span-2"
        hint={client ? "Leave empty to keep the current hash. The stored hash is never displayed." : "Paste the 64-character hexadecimal SHA-256 hash; the raw client secret is not stored."}
      >
        <Input
          id="secretSha256Hash"
          name="secretSha256Hash"
          maxLength={64}
          minLength={64}
          autoComplete="new-password"
          spellCheck={false}
          className="font-mono"
          required={!client}
        />
      </Field>
      <Field label="Scopes" name="scopes" className="md:col-span-2" hint="One scope per line: organization.sync, sms.usage, or thinktech-website.exchange. Comma-separated values also work.">
        <Textarea
          id="scopes"
          name="scopes"
          rows={4}
          maxLength={6500}
          defaultValue={client?.scopes.join("\n") ?? ""}
          required
        />
      </Field>
      <Checkbox name="isActive" defaultChecked={client?.isActive ?? true} label="Active" className="md:col-span-2" />
    </div>
  );
}
