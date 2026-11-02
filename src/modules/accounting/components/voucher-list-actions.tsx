"use client";

import Link from "next/link";
import { LoaderCircle, Pencil, Send, Trash2, Undo2, X } from "lucide-react";
import { createContext, use, useMemo, useState, useTransition, type ReactNode } from "react";
import type { ActionState } from "@/core/forms/action-state";
import { Alert } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/utils/cn";
import { deleteVoucherAction, postVoucherAction, setVouchersPostedAction, unpostVoucherAction } from "../actions/vouchers";
import type { Voucher } from "../types";

// The vouchers list's checkboxes, bulk post/unpost bar and per-row icons. The table itself stays a server
// component (dates and amounts are formatted on the server); these pieces share the selection through context.

export type VoucherRow = Pick<Voucher, "id" | "voucherRefNo" | "status">;

type Selection = {
  rows: VoucherRow[];
  selected: ReadonlySet<number>;
  toggle: (id: number) => void;
  toggleAll: () => void;
  clear: () => void;
};

const SelectionContext = createContext<Selection | null>(null);

function useSelection() {
  const context = use(SelectionContext);
  if (!context) throw new Error("Voucher checkboxes must be inside <VoucherSelection>");
  return context;
}

/** Drafts can be posted and posted vouchers unposted; a cancelled voucher can't change. */
const canSelect = (row: VoucherRow) => row.status === "Draft" || row.status === "Posted";

const checkboxClasses = "size-4 cursor-pointer rounded border-gray-300 accent-brand-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700";

const iconButton =
  "inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200";

export function VoucherSelection({ rows, children }: { rows: VoucherRow[]; children: ReactNode }) {
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  // After a refresh or on another page, only vouchers still listed and still checkable stay checked.
  const selected = useMemo(() => new Set(rows.filter((row) => canSelect(row) && picked.has(row.id)).map((row) => row.id)), [rows, picked]);

  const value = useMemo<Selection>(
    () => ({
      rows,
      selected,
      toggle: (id) =>
        setPicked((previous) => {
          const next = new Set(previous);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      toggleAll: () => {
        const selectable = rows.filter(canSelect);
        setPicked(selected.size === selectable.length ? new Set() : new Set(selectable.map((row) => row.id)));
      },
      clear: () => setPicked(new Set()),
    }),
    [rows, selected],
  );

  return <SelectionContext value={value}>{children}</SelectionContext>;
}

export function VoucherSelectAll() {
  const { rows, selected, toggleAll } = useSelection();
  const selectable = rows.filter(canSelect).length;
  const all = selectable > 0 && selected.size === selectable;
  const some = selected.size > 0 && !all;
  return (
    <input
      type="checkbox"
      ref={(input) => {
        if (input) input.indeterminate = some;
      }}
      checked={all}
      onChange={toggleAll}
      disabled={selectable === 0}
      aria-label="Select every voucher on this page"
      className={checkboxClasses}
    />
  );
}

export function VoucherCheckbox({ row }: { row: VoucherRow }) {
  const { selected, toggle } = useSelection();
  const selectable = canSelect(row);
  return (
    <input
      type="checkbox"
      checked={selected.has(row.id)}
      onChange={() => toggle(row.id)}
      disabled={!selectable}
      aria-label={`Select voucher ${row.voucherRefNo}`}
      title={selectable ? undefined : "A cancelled voucher can't be posted or unposted."}
      className={checkboxClasses}
    />
  );
}

/** Posts the checked drafts or unposts the checked posted vouchers; shows what went through and what didn't. */
export function VoucherBulkBar() {
  const { rows, selected, clear } = useSelection();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"post" | "unpost" | null>(null);
  const [result, setResult] = useState<ActionState | null>(null);

  const chosen = rows.filter((row) => selected.has(row.id));
  const drafts = chosen.filter((row) => row.status === "Draft");
  const posted = chosen.filter((row) => row.status === "Posted");

  function run(action: "post" | "unpost", items: VoucherRow[]) {
    const question =
      action === "post"
        ? `Post ${items.length} draft voucher(s) to the ledgers?`
        : `Unpost ${items.length} voucher(s)? Their entries leave the ledgers and they become drafts again.`;
    if (!window.confirm(question)) return;
    setResult(null);
    setRunning(action);
    startTransition(async () => {
      const outcome = await setVouchersPostedAction(
        items.map((row) => ({ id: row.id, refNo: row.voucherRefNo })),
        action,
      );
      setResult(outcome);
      setRunning(null);
      clear();
    });
  }

  if (chosen.length === 0 && !result) return null;

  return (
    <div className="space-y-3 border-b border-gray-100 px-5 py-3 sm:px-6 dark:border-gray-800">
      {chosen.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm font-medium text-gray-700 dark:text-gray-300">{chosen.length} selected</span>
          <Button size="sm" onClick={() => run("post", drafts)} disabled={pending || drafts.length === 0}>
            {running === "post" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            Post ({drafts.length})
          </Button>
          <Button size="sm" variant="outline" onClick={() => run("unpost", posted)} disabled={pending || posted.length === 0}>
            {running === "unpost" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Undo2 className="size-4" aria-hidden />}
            Unpost ({posted.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={clear} disabled={pending}>
            <X className="size-4" aria-hidden /> Clear
          </Button>
        </div>
      )}
      {result && result.status !== "idle" && (
        <div className="flex items-start gap-2">
          <Alert tone={result.status === "error" ? "error" : "success"} className="flex-1 whitespace-pre-line">
            {result.message}
          </Alert>
          <button type="button" onClick={() => setResult(null)} className={iconButton} aria-label="Dismiss" title="Dismiss">
            <X className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A row's icons: Edit and Delete for drafts (ACCOUNTING.M), Post for drafts and Unpost for posted vouchers
 * (ACCOUNTING.P). A posted voucher is unposted first to change it.
 */
export function VoucherRowActions({ row, canManage, canPost }: { row: VoucherRow; canManage: boolean; canPost: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const isDraft = row.status === "Draft";
  const ref = row.voucherRefNo;

  function run(action: () => Promise<ActionState>, question: string) {
    if (!window.confirm(question)) return;
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") setError(result.message);
    });
  }

  const showEdit = canManage && isDraft;
  const showPost = canPost && isDraft;
  const showUnpost = canPost && row.status === "Posted";
  const showDelete = canManage && isDraft;
  if (!showEdit && !showPost && !showUnpost && !showDelete) return null;

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1">
        {pending && <LoaderCircle className="size-4 animate-spin text-gray-400" aria-hidden />}
        {showEdit && (
          // Opens in a popup over the list (@modal/(.)[voucherId]/edit); saving comes back here.
          <Link href={`/accounting/vouchers/${row.id}/edit?from=list`} className={iconButton} title="Edit" aria-label={`Edit voucher ${ref}`}>
            <Pencil className="size-4" aria-hidden />
          </Link>
        )}
        {showPost && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => postVoucherAction(row.id), `Post voucher ${ref} to the ledgers?`)}
            className={cn(iconButton, "hover:text-brand-600 dark:hover:text-brand-400")}
            title="Post"
            aria-label={`Post voucher ${ref}`}
          >
            <Send className="size-4" aria-hidden />
          </button>
        )}
        {showUnpost && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => unpostVoucherAction(row.id), `Unpost voucher ${ref}? Its entries leave the ledgers and it becomes a draft again.`)
            }
            className={cn(iconButton, "hover:text-amber-600 dark:hover:text-amber-400")}
            title="Unpost"
            aria-label={`Unpost voucher ${ref}`}
          >
            <Undo2 className="size-4" aria-hidden />
          </button>
        )}
        {showDelete && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteVoucherAction(row.id, true), `Delete draft voucher ${ref}?`)}
            className={cn(iconButton, "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400")}
            title="Delete"
            aria-label={`Delete voucher ${ref}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </span>
      {error && <span className="max-w-60 text-right text-xs text-red-600 dark:text-red-400">{error}</span>}
    </span>
  );
}
