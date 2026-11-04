"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Checkbox, Field, Input, Textarea } from "@/core/forms/fields";
import { Button } from "@/core/ui/button";
import type { OrganizationClient } from "../types";
import { OrganizationClientOrganizationSelect } from "./organization-client-organization-select";
import { OrganizationClientCopyButton } from "./organization-client-copy-button";

export function OrganizationClientFields({ client }: { client?: OrganizationClient }) {
  const [clientName, setClientName] = useState(client?.clientName ?? "");
  const [clientSecret, setClientSecret] = useState(client?.clientSecret ?? "");
  const [secretHash, setSecretHash] = useState(client?.secretSha256Hash ?? "");
  const [hashError, setHashError] = useState<string>();

  async function generateHashKey() {
    if (!clientName.trim() || !clientSecret) {
      setSecretHash("");
      setHashError("Enter the client name and client secret first.");
      return;
    }

    try {
      const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(clientSecret));
      const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
      setSecretHash(hash);
      setHashError(undefined);
    } catch {
      setSecretHash("");
      setHashError("Could not generate the hash key in this browser.");
    }
  }

  function invalidateHash() {
    setSecretHash("");
    setHashError(undefined);
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <Field label="Client name" name="clientName" required>
        <div className="flex gap-2">
          <Input id="clientName" name="clientName" maxLength={64} value={clientName}
            onChange={(event) => { setClientName(event.target.value); invalidateHash(); }} autoComplete="off" required />
          <OrganizationClientCopyButton value={clientName} label="client name" />
        </div>
      </Field>
      <div className="md:col-span-2">
        <OrganizationClientOrganizationSelect
          initialId={client?.orgObjectId ?? null}
          initialName={client?.organizationName ?? null}
        />
      </div>
      <Field label="Acting user ID" name="actingUserId" hint="Optional. When set, the API uses this user for applicable integration actions.">
        <Input id="actingUserId" name="actingUserId" type="number" min={1} step={1} defaultValue={client?.actingUserId ?? ""} />
      </Field>
      <Field label="Client secret" name="clientSecret" className="md:col-span-2"
        hint={client ? "Enter a secret. Saving updates the stored secret and its authentication hash." : "The API stores this value and derives its SHA-256 authentication hash."}
        required>
        <div className="flex gap-2">
          <Input id="clientSecret" name="clientSecret" type="text" maxLength={512} value={clientSecret}
            onChange={(event) => { setClientSecret(event.target.value); invalidateHash(); }} autoComplete="off"
            spellCheck={false} className="font-mono" required />
          <OrganizationClientCopyButton value={clientSecret} label="client secret" />
        </div>
      </Field>
      <Field label="SHA-256 hash key" name="secretSha256Hash" className="md:col-span-2"
        hint="Generate the authentication hash from the client secret before saving.">
        <div className="flex flex-wrap gap-2">
          <Input id="secretSha256Hash" name="secretSha256Hash" value={secretHash} readOnly spellCheck={false}
            className="min-w-60 flex-1 font-mono" aria-invalid={Boolean(hashError)} />
          <OrganizationClientCopyButton value={secretHash} label="SHA-256 hash" />
          <Button type="button" variant="outline" onClick={generateHashKey}>
            <KeyRound className="size-4" aria-hidden />
            Generate Hash Key
          </Button>
        </div>
        {hashError && <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">{hashError}</p>}
      </Field>
      <Field label="Scopes" name="scopes" className="md:col-span-2"
        hint="Enter one scope per line or comma-separated. Any non-empty scope value is accepted.">
        <Textarea id="scopes" name="scopes" rows={4} maxLength={6500}
          defaultValue={client?.scopes.join("\n") ?? ""} required />
      </Field>
      <Checkbox name="isActive" defaultChecked={client?.isActive ?? true} label="Active" className="md:col-span-2" />
    </div>
  );
}
