import Form from "next/form";
import { Search } from "lucide-react";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Textarea } from "@/core/forms/fields";
import { Button, LinkButton } from "@/core/ui/button";
import { allocateAction, createClientAction, recordPurchaseAction, updateClientAction } from "../actions";
import type { SmsClient } from "../types";

export function ClientCreateForm() {
  return (
    <ActionForm action={createClientAction} className="space-y-5">
      <FormMessage />
      <Field
        label="Client ID"
        name="clientId"
        required
        hint="Stable identifier used by the client's API token (client_id claim). Cannot be changed later."
      >
        <Input id="clientId" name="clientId" maxLength={128} placeholder="e.g. acme-corp" required />
      </Field>
      <Field label="Display name" name="displayName" required>
        <Input id="displayName" name="displayName" maxLength={200} placeholder="e.g. Acme Corporation" required />
      </Field>
      <div className="flex gap-3">
        <SubmitButton pendingLabel="Creating…">Create client</SubmitButton>
        <LinkButton href="/sms/clients" variant="outline">
          Cancel
        </LinkButton>
      </div>
    </ActionForm>
  );
}

export function ClientEditForm({ client }: { client: SmsClient }) {
  return (
    <ActionForm action={updateClientAction.bind(null, client.clientId)} className="space-y-5">
      <FormMessage />
      <Field label="Display name" name="displayName" required>
        <Input id="displayName" name="displayName" maxLength={200} defaultValue={client.displayName} required />
      </Field>
      <Checkbox name="isActive" defaultChecked={client.isActive} label="Active (can send SMS)" />
      <div>
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function AllocateForm({ clientId }: { clientId: string }) {
  return (
    <ActionForm action={allocateAction.bind(null, clientId)} className="space-y-5" resetOnSuccess>
      <FormMessage />
      <Field label="SMS quantity" name="smsQuantity" required hint="Moved from the platform's unallocated balance.">
        <Input id="smsQuantity" name="smsQuantity" inputMode="numeric" placeholder="e.g. 5000" required />
      </Field>
      <Field label="Note" name="note">
        <Input id="note" name="note" maxLength={500} placeholder="Optional" />
      </Field>
      <div>
        <SubmitButton pendingLabel="Allocating…">Allocate SMS</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PurchaseForm() {
  return (
    <ActionForm action={recordPurchaseAction} className="grid grid-cols-1 gap-5 md:grid-cols-2" resetOnSuccess>
      <FormMessage className="md:col-span-2" />
      <Field label="SMS quantity" name="smsQuantity" required>
        <Input id="smsQuantity" name="smsQuantity" inputMode="numeric" placeholder="e.g. 100000" required />
      </Field>
      <Field label="Provider reference" name="providerReference" hint="Invoice or order number from ADN.">
        <Input id="providerReference" name="providerReference" maxLength={128} placeholder="Optional" />
      </Field>
      <Field label="Amount paid" name="amountPaid">
        <Input id="amountPaid" name="amountPaid" inputMode="decimal" placeholder="Optional, e.g. 25000.00" />
      </Field>
      <Field label="Currency" name="currency" hint="3-letter ISO code.">
        <Input id="currency" name="currency" maxLength={3} placeholder="BDT" className="uppercase" />
      </Field>
      <Field label="Note" name="note" className="md:col-span-2">
        <Textarea id="note" name="note" rows={2} maxLength={500} placeholder="Optional" />
      </Field>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="Recording…">Record purchase</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** GET form that filters a list by client ID (client-side navigation via next/form). */
export function ClientFilterForm({ action, clientId }: { action: string; clientId?: string }) {
  return (
    <Form action={action} className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <Input name="clientId" defaultValue={clientId} placeholder="Filter by client ID" className="h-9 w-56 pl-9" aria-label="Client ID" />
      </div>
      <Button type="submit" variant="outline" size="sm">
        Filter
      </Button>
      {clientId && (
        <LinkButton href={action} variant="ghost" size="sm">
          Clear
        </LinkButton>
      )}
    </Form>
  );
}
