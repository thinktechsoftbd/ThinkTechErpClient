"use client";

import Form from "next/form";
import { Check, Copy, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { Button, LinkButton } from "@/core/ui/button";
import {
  allocateAction,
  allocateToClientAction,
  createClientAction,
  getNextClientIdAction,
  recordPurchaseAction,
  recordUsageAction,
  updateAllocationAction,
  updatePurchaseAction,
  updateClientAction,
} from "../actions";
import type { SmsAdnPurchase, SmsClient, SmsClientAllocation } from "../types";

/** Shown in the New client dialog; closes it once the client is created. */
export function ClientCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getNextClientIdAction().then((nextId) => {
      if (active) setClientId(nextId);
    });
    return () => {
      active = false;
    };
  }, []);

  async function copyClientId() {
    if (!clientId) return;
    await navigator.clipboard.writeText(clientId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <ActionForm action={createClientAction} className="space-y-5" onSuccess={onSuccess}>
      <FormMessage />
      <Field
        label="Client ID"
        name="clientId"
        required
        hint="Generated automatically and used by the client's API token (client_id claim). Cannot be changed later."
      >
        <div className="flex gap-2">
          <Input
            id="clientId"
            name="clientId"
            value={clientId ?? ""}
            readOnly
            required
            aria-busy={!clientId}
            placeholder="Generating client ID…"
            className="min-w-0 flex-1 font-mono"
          />
          <Button type="button" variant="outline" size="md" onClick={copyClientId} disabled={!clientId} aria-label="Copy client ID">
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </Field>
      <Field label="Display name" name="displayName" required>
        <Input id="displayName" name="displayName" maxLength={200} placeholder="e.g. Acme Corporation" required />
      </Field>
      <div className="flex gap-3">
        <SubmitButton pendingLabel="Creating…">Create client</SubmitButton>
        <Button variant="outline" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </ActionForm>
  );
}

/** Inline on the client page, or in the list's Edit dialog when `onSuccess`/`onCancel` are given. */
export function ClientEditForm({
  client,
  onSuccess,
  onCancel,
}: {
  client: SmsClient;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  return (
    <ActionForm action={updateClientAction.bind(null, client.clientId)} className="space-y-5" onSuccess={onSuccess}>
      <FormMessage />
      <Field label="Display name" name="displayName" required>
        <Input id="displayName" name="displayName" maxLength={200} defaultValue={client.displayName} required />
      </Field>
      <Checkbox name="isActive" defaultChecked={client.isActive} label="Active (can send SMS)" />
      <div className="flex gap-3">
        <SubmitButton>Save changes</SubmitButton>
        {onCancel && (
          <Button variant="outline" size="md" onClick={onCancel}>
            Cancel
          </Button>
        )}
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
      <Checkbox name="isFinalized" label="Is Finalized" />
      <div>
        <SubmitButton pendingLabel="Allocating…">Allocate SMS</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PurchaseForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [currency, setCurrency] = useState("BDT");
  return (
    <ActionForm action={recordPurchaseAction} className="grid grid-cols-1 gap-5 md:grid-cols-3" resetOnSuccess onSuccess={onSuccess}>
      <FormMessage className="md:col-span-3" />
      <div className="grid grid-cols-1 gap-5 md:col-span-3 md:grid-cols-2">
        <Field label="Provider" name="providerReference" required hint="Invoice or order number from ADN.">
          <Input id="providerReference" name="providerReference" maxLength={128} placeholder="Enter provider reference" required />
        </Field>
        <Field label="SMS quantity" name="smsQuantity" required hint="Must be greater than 0.">
          <Input id="smsQuantity" name="smsQuantity" type="number" inputMode="numeric" min={1} step={1} placeholder="e.g. 100000" required />
        </Field>
      </div>
      <Field label="Amount paid" name="amountPaid" required>
        <Input id="amountPaid" name="amountPaid" inputMode="decimal" placeholder="e.g. 25000.00" required />
      </Field>
      <Field label="Currency" name="currency" required>
        <div className="flex h-11 items-center gap-5">
          {(["BDT", "USD"] as const).map((option) => (
            <label key={option} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="currency"
                value={option}
                checked={currency === option}
                onChange={() => setCurrency(option)}
                className="size-4 accent-brand-500"
              />
              {option}
            </label>
          ))}
        </div>
      </Field>
      {currency === "USD" && (
        <Field label="Exchange rate" name="exchangeRate" required hint="Enter the USD to BDT rate for this purchase.">
          <Input id="exchangeRate" name="exchangeRate" inputMode="decimal" placeholder="e.g. 110.50" required />
        </Field>
      )}
      {currency !== "USD" && <div className="hidden md:block" aria-hidden />}
      <Field label="Note" name="note" className="md:col-span-3">
        <Textarea id="note" name="note" rows={2} maxLength={500} placeholder="Optional" />
      </Field>
      <div className="md:col-span-3">
        <SubmitButton pendingLabel="Recording…">Record purchase</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PurchaseEditForm({
  purchase,
  onSuccess,
  onCancel,
}: {
  purchase: SmsAdnPurchase;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const initialCurrency = purchase.currency?.trim() === "USD" ? "USD" : "BDT";
  const [currency, setCurrency] = useState(initialCurrency);

  return (
    <ActionForm
      action={updatePurchaseAction.bind(null, purchase.purchaseId)}
      className="grid grid-cols-1 gap-5 md:grid-cols-3"
      onSuccess={onSuccess}
    >
      <FormMessage className="md:col-span-3" />
      <div className="grid grid-cols-1 gap-5 md:col-span-3 md:grid-cols-2">
        <Field label="Provider" name="providerReference" required>
          <Input
            id="providerReference"
            name="providerReference"
            maxLength={128}
            defaultValue={purchase.providerReference ?? purchase.provider}
            required
          />
        </Field>
        <Field label="SMS quantity" name="smsQuantity">
          <Input id="smsQuantity" type="number" value={purchase.smsQuantity} readOnly aria-readonly="true" />
        </Field>
      </div>
      <Field label="Amount paid" name="amountPaid" required>
        <Input
          id="amountPaid"
          name="amountPaid"
          inputMode="decimal"
          defaultValue={purchase.amountPaid ?? ""}
          required
        />
      </Field>
      <Field label="Currency" name="currency" required>
        <div className="flex h-11 items-center gap-5">
          {(["BDT", "USD"] as const).map((option) => (
            <label key={option} className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="currency"
                value={option}
                checked={currency === option}
                onChange={() => setCurrency(option)}
                className="size-4 accent-brand-500"
              />
              {option}
            </label>
          ))}
        </div>
      </Field>
      {currency === "USD" ? (
        <Field label="Exchange rate" name="exchangeRate" required hint="Enter the USD to BDT rate for this purchase.">
          <Input
            id="exchangeRate"
            name="exchangeRate"
            inputMode="decimal"
            defaultValue={purchase.exchangeRate ?? ""}
            required
          />
        </Field>
      ) : (
        <div className="hidden md:block" aria-hidden />
      )}
      <Field label="Note" name="note" className="md:col-span-3">
        <Textarea id="note" name="note" rows={2} maxLength={500} defaultValue={purchase.note ?? ""} />
      </Field>
      <div className="flex gap-3 md:col-span-3">
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        <Button variant="outline" size="md" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </ActionForm>
  );
}

function ClientOptions({ clients }: { clients: SmsClient[] }) {
  return (
    <>
      {clients.map((client) => (
        <option key={client.clientId} value={client.clientId}>
          {client.displayName} ({client.clientId}){client.isActive ? "" : " — inactive"}
        </option>
      ))}
    </>
  );
}

export function AllocationEditForm({
  allocation,
  onSuccess,
  onCancel,
}: {
  allocation: SmsClientAllocation;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  return (
    <ActionForm action={updateAllocationAction.bind(null, allocation.allocationId)} className="space-y-5" onSuccess={onSuccess}>
      <FormMessage />
      <Field label="Client" name="clientId">
        <Input id="allocation-client" value={allocation.clientId} readOnly aria-readonly="true" />
      </Field>
      <Field label="SMS quantity" name="smsQuantity">
        <Input id="allocation-quantity" type="number" value={allocation.smsQuantity} readOnly aria-readonly="true" />
      </Field>
      <Field label="Note" name="note">
        <Textarea id="allocation-note" name="note" rows={3} maxLength={500} defaultValue={allocation.note ?? ""} />
      </Field>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Is Finalized: <span className="font-medium">{allocation.isFinalized ? "Yes" : "No"}</span>
      </p>
      <div className="flex gap-3">
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        <Button variant="outline" size="md" onClick={onCancel}>Cancel</Button>
      </div>
    </ActionForm>
  );
}

/** Allocation with the client chosen in the popup on the Allocations page. */
export function AllocateToClientForm({
  clients,
  clientId,
  onSuccess,
  onCancel,
}: {
  clients: SmsClient[];
  clientId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  return (
    <ActionForm action={allocateToClientAction} className="space-y-5" resetOnSuccess onSuccess={onSuccess}>
      <FormMessage />
      <Field label="Client" name="clientId" required>
        <Select id="clientId" name="clientId" defaultValue={clientId ?? ""} required>
          <option value="" disabled>
            Choose a client
          </option>
          <ClientOptions clients={clients} />
        </Select>
      </Field>
      <Field label="SMS quantity" name="smsQuantity" required>
        <Input id="smsQuantity" name="smsQuantity" inputMode="numeric" placeholder="e.g. 5000" required />
      </Field>
      <Field label="Note" name="note">
        <Input id="note" name="note" maxLength={500} placeholder="Optional" />
      </Field>
      <Checkbox name="isFinalized" label="Is Finalized" />
      <div className="flex gap-3">
        <SubmitButton pendingLabel="Allocating…">Allocate SMS</SubmitButton>
        {onCancel && <Button variant="outline" size="md" onClick={onCancel}>Cancel</Button>}
      </div>
    </ActionForm>
  );
}

/** Records SMS sent by a client (POST /api/sms/clients/{clientId}/usage). */
export function UsageForm({ clientId }: { clientId: string }) {
  return (
    <ActionForm action={recordUsageAction.bind(null, clientId)} className="grid grid-cols-1 gap-5 md:grid-cols-2" resetOnSuccess>
      <FormMessage className="md:col-span-2" />
      <Field label="SMS quantity" name="smsQuantity" required hint="Deducted from the client's available balance.">
        <Input id="smsQuantity" name="smsQuantity" inputMode="numeric" placeholder="e.g. 1" required />
      </Field>
      <Field label="Request reference" name="requestReference" required hint="Unique per send; repeats are rejected.">
        <Input id="requestReference" name="requestReference" maxLength={128} placeholder="e.g. order-5531" required />
      </Field>
      <Field label="Recipient" name="recipient">
        <Input id="recipient" name="recipient" maxLength={32} placeholder="Optional, e.g. +8801700000000" />
      </Field>
      <Field label="Provider message ID" name="providerMessageId">
        <Input id="providerMessageId" name="providerMessageId" maxLength={128} placeholder="Optional" />
      </Field>
      <div className="md:col-span-2">
        <SubmitButton pendingLabel="Recording…">Record usage</SubmitButton>
      </div>
    </ActionForm>
  );
}

/** GET form that picks the client shown on a page (client-side navigation via next/form). */
export function ClientPickerForm({ action, clients, clientId }: { action: string; clients: SmsClient[]; clientId?: string }) {
  return (
    <Form action={action} className="flex flex-wrap items-center gap-2">
      <Select name="clientId" defaultValue={clientId ?? ""} className="h-9 w-72" aria-label="Client">
        <option value="" disabled>
          Choose a client
        </option>
        <ClientOptions clients={clients} />
      </Select>
      <Button type="submit" variant="outline" size="sm">
        Show
      </Button>
    </Form>
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
