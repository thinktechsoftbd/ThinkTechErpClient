"use client";

import Link from "next/link";
import { Check, CheckCircle2, Copy, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/core/ui/button";
import { Dialog } from "@/core/ui/dialog";
import { ConfirmActionButton } from "@/core/forms/confirm-action-button";
import { deleteClientAction, finalizeAllocationAction } from "../actions";
import type { SmsAdnPurchase, SmsClient, SmsClientAllocation } from "../types";
import {
  AllocateToClientForm,
  AllocationEditForm,
  ClientCreateForm,
  ClientEditForm,
  PurchaseEditForm,
  PurchaseForm,
} from "./forms";

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200";

/** "New client" button that opens the create form in a dialog. */
export function NewClientButton() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> New client
      </Button>
      <Dialog open={open} onClose={close} title="New SMS client" description="The client starts with a zero balance.">
        <ClientCreateForm onSuccess={close} onCancel={close} />
      </Dialog>
    </>
  );
}

export function AllocateDialogButton({ clients, clientId }: { clients: SmsClient[]; clientId?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Allocate SMS
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Allocate SMS"
        description="Transfer SMS from the platform's unallocated balance to a client."
      >
        <AllocateToClientForm clients={clients} clientId={clientId} onSuccess={close} onCancel={close} />
      </Dialog>
    </>
  );
}

export function AllocationRowActions({ allocation }: { allocation: SmsClientAllocation }) {
  const [editing, setEditing] = useState(false);
  const close = () => setEditing(false);

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={iconButton}
        title="Edit allocation note"
        aria-label={`Edit allocation ${allocation.allocationId}`}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      {allocation.isFinalized ? (
        <span className="inline-flex size-8 items-center justify-center text-green-600 dark:text-green-400" title="Finalized" aria-label="Finalized">
          <CheckCircle2 className="size-4" aria-hidden />
        </span>
      ) : (
        <ConfirmActionButton
          action={finalizeAllocationAction.bind(null, allocation.allocationId)}
          confirmMessage={`Finalize allocation ${allocation.allocationId} for ${allocation.clientId}? This cannot be undone.`}
          className={iconButton}
        >
          <CheckCircle2 className="size-4" aria-hidden />
          <span className="sr-only">Finalize allocation {allocation.allocationId}</span>
        </ConfirmActionButton>
      )}
      <Dialog
        open={editing}
        onClose={close}
        title="Edit allocation"
        description={`Allocation #${allocation.allocationId}; client and SMS quantity are locked to preserve the ledger.`}
      >
        <AllocationEditForm allocation={allocation} onSuccess={close} onCancel={close} />
      </Dialog>
    </span>
  );
}

export function PurchaseDialogButton() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Record purchase
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title="Record ADN purchase"
        description="Add an SMS purchase to the platform balance."
        className="max-w-[min(48rem,calc(100%-2rem))]"
      >
        <PurchaseForm onSuccess={close} />
      </Dialog>
    </>
  );
}

export function PurchaseRowActions({ purchase }: { purchase: SmsAdnPurchase }) {
  const [editing, setEditing] = useState(false);
  const close = () => setEditing(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={iconButton}
        title="Edit purchase"
        aria-label={`Edit purchase ${purchase.purchaseId}`}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <Dialog
        open={editing}
        onClose={close}
        title="Edit ADN purchase"
        description={`Purchase #${purchase.purchaseId}; SMS quantity cannot be changed.`}
        className="max-w-[min(48rem,calc(100%-2rem))]"
      >
        <PurchaseEditForm purchase={purchase} onSuccess={close} onCancel={close} />
      </Dialog>
    </>
  );
}

/** Edit (dialog) and details (client page) icons for a row of the clients table. */
export function ClientRowActions({ client }: { client: SmsClient }) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const close = () => setEditing(false);

  async function copyClientId() {
    await navigator.clipboard.writeText(client.clientId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={iconButton}
        title="Edit"
        aria-label={`Edit ${client.clientId}`}
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <Link
        href={`/sms/clients/${encodeURIComponent(client.clientId)}`}
        className={iconButton}
        title="Client details"
        aria-label={`Details of ${client.clientId}`}
      >
        <Eye className="size-4" aria-hidden />
      </Link>
      <ConfirmActionButton
        action={deleteClientAction.bind(null, client.clientId)}
        confirmMessage={`Deactivate client ${client.clientId}? Its wallet and billing history will be preserved.`}
        className={iconButton}
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="sr-only">Deactivate {client.clientId}</span>
      </ConfirmActionButton>
      <Dialog
        open={editing}
        onClose={close}
        title="Edit client"
        description={
          <>
            <span className="inline-flex items-center gap-2">
              Client ID <code className="font-mono">{client.clientId}</code>
              <button
                type="button"
                onClick={copyClientId}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-white/5"
                aria-label="Copy client ID"
              >
                {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </span>
          </>
        }
      >
        <ClientEditForm client={client} onSuccess={close} onCancel={close} />
      </Dialog>
    </span>
  );
}
