import Link from "next/link";
import { Pencil } from "lucide-react";
import { ConfirmActionButton } from "@/core/crud/confirm-action-button";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { LockedRowActions } from "@/core/crud/locked-row-actions";
import { rowIconAction } from "@/core/crud/row-action";
import type { ActionState } from "@/core/forms/action-state";

type Action = () => Promise<ActionState>;

/**
 * Edit and Delete of a purchase, sales or service invoice row. Only a finalized invoice (its bill voucher posted) that
 * is fully paid, or a cancelled one, is Locked. A draft is edited and deleted as usual. Any other posted invoice goes
 * back to draft first (its stock reversed; a finalized one's bill voucher unposted), after a confirmation, then opens
 * to edit or is deleted.
 */
export function InvoiceRowActions({
  invoice,
  noun,
  editHref,
  deleteDraft,
  unpostAndEdit,
  unpostAndDelete,
  movesStock = true,
}: {
  invoice: { invoiceNo: string; status: string; paymentStatus: string; billVoucherStatus: string | null; billVoucherRefNo: string | null };
  /** "sale", "purchase invoice", "service invoice". */
  noun: string;
  editHref: string;
  deleteDraft: Action;
  /** Back to draft, then opens the edit page. */
  unpostAndEdit: Action;
  /** Back to draft, then deletes it. */
  unpostAndDelete: Action;
  /** False for a service invoice, which moves no stock. */
  movesStock?: boolean;
}) {
  const no = invoice.invoiceNo;
  if (invoice.status === "Cancelled") return <LockedRowActions reason={`A cancelled ${noun} can't be edited or deleted.`} />;
  const finalized = invoice.billVoucherStatus === "Posted";
  if (finalized && invoice.paymentStatus === "Paid")
    return (
      <LockedRowActions
        reason={`Finalized and fully paid: unpost its bill voucher ${invoice.billVoucherRefNo ?? ""} (Accounting → Vouchers) and the ${noun} goes back to draft, to edit or delete.`}
      />
    );

  if (invoice.status === "Draft")
    return (
      <span className="inline-flex items-center gap-1">
        <Link href={editHref} className={rowIconAction("edit")} title={`Edit ${no}`} aria-label={`Edit ${no}`}>
          <Pencil className="size-4" aria-hidden />
        </Link>
        <ConfirmDeleteButton iconOnly action={deleteDraft} itemLabel={`draft ${noun} ${no}`} />
      </span>
    );

  // Posted: not finalized, or finalized but not fully paid.
  const reversed = movesStock ? " Its stock movement is reversed." : "";
  const voucher = finalized ? ` Its bill voucher ${invoice.billVoucherRefNo ?? ""} is unposted.` : "";
  return (
    <span className="inline-flex items-center gap-1">
      <ConfirmActionButton
        action={unpostAndEdit}
        label={`Edit ${no}`}
        icon={<Pencil className="size-4" aria-hidden />}
        tone="edit"
        title={`Edit ${no}?`}
        message={`${no} is ${finalized ? "finalized" : "posted"}. It goes back to draft first, so it can be changed and ${finalized ? "finalized" : "posted"} again.${voucher}${reversed}`}
        confirmLabel="Back to draft & edit"
        pendingLabel="Putting back to draft…"
      />
      <ConfirmDeleteButton
        iconOnly
        action={unpostAndDelete}
        itemLabel={`${noun} ${no}`}
        message={`It is ${finalized ? "finalized" : "posted"}: it goes back to draft first, then it is deleted.${voucher}${reversed} This cannot be undone.`}
      />
    </span>
  );
}
