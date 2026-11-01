"use client";

import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useOptimistic, useState, useTransition, type ReactNode } from "react";
import { rowActionClass } from "@/core/crud/form-modal-button";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { Alert } from "@/core/ui/alert";
import { Badge } from "@/core/ui/badge";
import { Button, buttonClasses } from "@/core/ui/button";
import { Modal } from "@/core/ui/modal";
import { cn } from "@/core/utils/cn";
import { deleteAccountAction, saveAccountAction, setAccountActiveAction } from "../actions/chart";
import { ACCOUNT_NATURES, LEDGER_LEVEL, LEDGER_TYPES, PARTY_TYPES, levelName, type ChartAccount } from "../types";

type Dialog =
  | { kind: "create"; parent: ChartAccount | null }
  | { kind: "edit"; account: ChartAccount }
  | { kind: "delete"; account: ChartAccount };

type CheckState = "checked" | "indeterminate" | "unchecked";

const natureTone = { Asset: "brand", Liability: "warning", Equity: "success", Income: "success", Expense: "error" } as const;

/** Digits a level adds to its parent's code, as the API numbers them: 1, 11, 1101, 110101, 110101001. */
const codeDigits = (level: number) => (level <= 2 ? 1 : level <= 4 ? 2 : 3);

function byOrder(a: ChartAccount, b: ChartAccount) {
  return a.sortOrder - b.sortOrder || a.code.localeCompare(b.code, undefined, { numeric: true });
}

/** The code the API gives a new account left without one: the parent's code plus the next number. */
function nextCode(parent: ChartAccount | null, siblings: ChartAccount[]) {
  const prefix = parent?.code ?? "";
  const level = (parent?.level ?? 0) + 1;
  const last = siblings
    .filter((s) => s.code.startsWith(prefix) && /^\d{1,15}$/.test(s.code.slice(prefix.length)))
    .reduce((max, s) => Math.max(max, Number(s.code.slice(prefix.length))), 0);
  return prefix + String(last + 1).padStart(codeDigits(level), "0");
}

/** Ticking activates the branch and its parents; clearing deactivates the branch (as the API does). */
function applyActive(accounts: ChartAccount[], change: { id: number; isActive: boolean }) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const affected = new Set<number>([change.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const account of accounts) {
      if (account.parentId !== null && affected.has(account.parentId) && !affected.has(account.id)) {
        affected.add(account.id);
        grew = true;
      }
    }
  }
  if (change.isActive) {
    for (let parentId = byId.get(change.id)?.parentId ?? null; parentId !== null; parentId = byId.get(parentId)?.parentId ?? null)
      affected.add(parentId);
  }
  return accounts.map((a) => (affected.has(a.id) ? { ...a, isActive: change.isActive } : a));
}

/**
 * The chart of accounts as a tree of checkboxes: Parent Class → Account Class → Main Class →
 * Map Class → Sub Class (ledger head). A ticked account is in use; clearing a checkbox stops the
 * account and everything below it from being posted to. A half-ticked box has cleared accounts below it.
 */
export function ChartOfAccountsTree({
  accounts,
  canManage,
  empty,
}: {
  accounts: ChartAccount[];
  canManage: boolean;
  /** Shown in place of the tree while the chart has no accounts. */
  empty?: ReactNode;
}) {
  const [optimistic, setOptimistic] = useOptimistic(accounts, applyActive);
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(accounts.filter((a) => a.level <= 2).map((a) => a.id)),
  );
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [dialogKey, setDialogKey] = useState(0);

  const children = useMemo(() => {
    const map = new Map<number | null, ChartAccount[]>();
    for (const account of optimistic) {
      const list = map.get(account.parentId) ?? [];
      list.push(account);
      map.set(account.parentId, list);
    }
    for (const list of map.values()) list.sort(byOrder);
    return map;
  }, [optimistic]);

  // How many accounts below each one are cleared, for the half-ticked state.
  const clearedBelow = useMemo(() => {
    const counts = new Map<number, number>();
    const visit = (account: ChartAccount): number => {
      let cleared = 0;
      for (const child of children.get(account.id) ?? []) cleared += visit(child) + (child.isActive ? 0 : 1);
      counts.set(account.id, cleared);
      return cleared;
    };
    (children.get(null) ?? []).forEach(visit);
    return counts;
  }, [children]);

  const descendants = (id: number): number =>
    (children.get(id) ?? []).reduce((sum, child) => sum + 1 + descendants(child.id), 0);

  // While searching: the matches and the accounts above them, all opened.
  const term = query.trim().toLowerCase();
  const visible = useMemo(() => {
    if (!term) return null;
    const byId = new Map(optimistic.map((a) => [a.id, a]));
    const shown = new Set<number>();
    for (const account of optimistic) {
      if (!account.code.toLowerCase().includes(term) && !account.name.toLowerCase().includes(term)) continue;
      for (let current: ChartAccount | undefined = account; current; current = current.parentId ? byId.get(current.parentId) : undefined)
        shown.add(current.id);
    }
    return shown;
  }, [optimistic, term]);

  const checkState = (account: ChartAccount): CheckState =>
    !account.isActive ? "unchecked" : (clearedBelow.get(account.id) ?? 0) > 0 ? "indeterminate" : "checked";

  function toggle(account: ChartAccount) {
    const isActive = checkState(account) !== "checked";
    const below = descendants(account.id);
    if (!isActive && below > 0 &&
      !window.confirm(`Clear ${account.code} ${account.name} and the ${below} account(s) below it? They can't be posted to until ticked again.`))
      return;
    setError(undefined);
    setBusyId(account.id);
    startTransition(async () => {
      setOptimistic({ id: account.id, isActive });
      const result = await setAccountActiveAction(account.id, isActive);
      if (result.status === "error") setError(result.message);
      setBusyId(null);
    });
  }

  function open(next: Dialog) {
    setDialogKey((key) => key + 1);
    setDialog(next);
  }

  const ledgerHeads = optimistic.filter((a) => a.level === LEDGER_LEVEL).length;
  const roots = children.get(null) ?? [];

  function renderNode(account: ChartAccount) {
    if (visible && !visible.has(account.id)) return null;
    const kids = children.get(account.id) ?? [];
    const isOpen = visible ? true : expanded.has(account.id);
    const state = checkState(account);
    return (
      <li key={account.id} role="treeitem" aria-expanded={kids.length > 0 ? isOpen : undefined} aria-selected={false}>
        <div
          className={cn(
            "group flex items-center gap-2 border-b border-gray-100 py-2 pr-3 hover:bg-gray-50 sm:pr-4 dark:border-gray-800 dark:hover:bg-white/[0.02]",
            !account.isActive && "text-gray-400 dark:text-gray-500",
          )}
          style={{ paddingLeft: `${0.75 + (account.level - 1) * 1.5}rem` }}
        >
          {kids.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(account.id)) next.delete(account.id);
                  else next.add(account.id);
                  return next;
                })
              }
              className="flex size-6 shrink-0 items-center justify-center rounded text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
              aria-label={isOpen ? `Collapse ${account.name}` : `Expand ${account.name}`}
              disabled={Boolean(visible)}
            >
              {isOpen ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
            </button>
          ) : (
            <span className="size-6 shrink-0" aria-hidden />
          )}
          <span className="relative flex size-4 shrink-0 items-center justify-center">
            {busyId === account.id && pending ? (
              <LoaderCircle className="size-4 animate-spin text-brand-500" aria-hidden />
            ) : (
              <input
                type="checkbox"
                className="size-4 cursor-pointer rounded border-gray-300 accent-brand-500 disabled:cursor-not-allowed dark:border-gray-700"
                checked={state === "checked"}
                ref={(element) => {
                  if (element) element.indeterminate = state === "indeterminate";
                }}
                onChange={() => toggle(account)}
                disabled={!canManage || pending}
                aria-label={`${account.code} ${account.name} in use`}
                title={
                  state === "checked"
                    ? "In use"
                    : state === "indeterminate"
                      ? "In use; some accounts below are cleared"
                      : "Cleared: not used for new entries"
                }
              />
            )}
          </span>
          <span className="w-24 shrink-0 font-mono text-xs text-gray-500 tabular-nums sm:w-28 dark:text-gray-400">{account.code}</span>
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm",
                account.level < LEDGER_LEVEL ? "font-medium text-gray-800 dark:text-white/90" : "text-gray-700 dark:text-gray-300",
                !account.isActive && "text-gray-400 line-through decoration-gray-300 dark:text-gray-500",
              )}
            >
              {account.name}
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 md:flex">
            {account.level === 1 && <Badge tone={natureTone[account.nature]}>{account.nature}</Badge>}
            {account.ledgerType && account.ledgerType !== "General" && <Badge tone="brand">{account.ledgerType}</Badge>}
            {account.partyType && <Badge tone="warning">{account.partyType} ledger</Badge>}
            <span className="w-24 text-right text-xs text-gray-400">{levelName(account.level)}</span>
          </span>
          {canManage && (
            <span className="flex shrink-0 items-center opacity-70 group-hover:opacity-100">
              {account.level < LEDGER_LEVEL && (
                <button
                  type="button"
                  className={rowActionClass}
                  onClick={() => open({ kind: "create", parent: account })}
                  title={`Add a ${levelName(account.level + 1)} under ${account.name}`}
                >
                  <Plus className="size-4" aria-hidden />
                  <span className="hidden xl:inline">{levelName(account.level + 1)}</span>
                </button>
              )}
              <button
                type="button"
                className={rowActionClass}
                onClick={() => open({ kind: "edit", account })}
                title={`Edit ${account.name}`}
                aria-label={`Edit ${account.name}`}
              >
                <Pencil className="size-4" aria-hidden />
              </button>
              {kids.length === 0 && !account.hasEntries && (
                <button
                  type="button"
                  className={cn(rowActionClass, "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10")}
                  onClick={() => open({ kind: "delete", account })}
                  title={`Delete ${account.name}`}
                  aria-label={`Delete ${account.name}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </span>
          )}
        </div>
        {kids.length > 0 && isOpen && <ul role="group">{kids.map(renderNode)}</ul>}
      </li>
    );
  }

  const shownCount = visible ? visible.size : optimistic.length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-4 sm:px-6 dark:border-gray-800">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            {optimistic.length} account(s) · {ledgerHeads} ledger head(s)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ticked accounts are in use. Clear a checkbox to stop posting to that account and everything below it.
          </p>
        </div>
        <span className="relative block w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find by code or name"
            aria-label="Find an account"
            className="h-9 pl-9"
          />
        </span>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set(optimistic.map((a) => a.id)))} disabled={Boolean(visible)}>
          <ChevronsUpDown className="size-4" aria-hidden /> Expand all
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set())} disabled={Boolean(visible)}>
          <ChevronsDownUp className="size-4" aria-hidden /> Collapse all
        </Button>
        {canManage && (
          <Button size="sm" onClick={() => open({ kind: "create", parent: null })}>
            <Plus className="size-4" aria-hidden /> Parent class
          </Button>
        )}
      </div>

      {error && (
        <Alert tone="error" className="mx-5 mt-4 sm:mx-6">
          {error}
        </Alert>
      )}

      {optimistic.length === 0 ? (
        empty
      ) : visible && shownCount === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No account matches “{query.trim()}”.</p>
      ) : (
        <ul role="tree" aria-label="Chart of accounts" className="pb-2">
          {roots.map(renderNode)}
        </ul>
      )}

      <Modal
        open={dialog !== null}
        onClose={() => setDialog(null)}
        size={dialog?.kind === "delete" ? "sm" : "md"}
        title={
          dialog?.kind === "create"
            ? `New ${levelName((dialog.parent?.level ?? 0) + 1)}`
            : dialog?.kind === "edit"
              ? `Edit ${levelName(dialog.account.level)}`
              : "Delete account"
        }
        description={
          dialog?.kind === "create" && dialog.parent
            ? `Under ${dialog.parent.code} ${dialog.parent.name}`
            : dialog?.kind === "edit"
              ? `${dialog.account.code} ${dialog.account.name}`
              : undefined
        }
      >
        {dialog?.kind === "delete" ? (
          <DeleteAccount key={dialogKey} account={dialog.account} onDone={() => setDialog(null)} />
        ) : dialog ? (
          <ActionForm
            key={dialogKey}
            action={saveAccountAction.bind(null, dialog.kind === "edit" ? dialog.account.id : null)}
            onSuccess={() => {
              // Open the parent so the new account shows.
              if (dialog.kind === "create" && dialog.parent) {
                const parentId = dialog.parent.id;
                setExpanded((current) => new Set(current).add(parentId));
              }
              setDialog(null);
            }}
            className="space-y-5"
          >
            <FormMessage />
            <AccountFields
              dialog={dialog}
              accounts={optimistic}
              siblings={children.get(dialog.kind === "create" ? (dialog.parent?.id ?? null) : dialog.account.parentId) ?? []}
            />
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
              <Button variant="outline" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <SubmitButton className="min-w-28">{dialog.kind === "create" ? "Add" : "Save"}</SubmitButton>
            </div>
          </ActionForm>
        ) : null}
      </Modal>
    </>
  );
}

function AccountFields({
  dialog,
  accounts,
  siblings,
}: {
  dialog: Extract<Dialog, { kind: "create" | "edit" }>;
  accounts: ChartAccount[];
  siblings: ChartAccount[];
}) {
  const account = dialog.kind === "edit" ? dialog.account : null;
  const parent =
    dialog.kind === "create" ? dialog.parent : (accounts.find((a) => a.id === dialog.account.parentId) ?? null);
  const level = account?.level ?? (parent?.level ?? 0) + 1;
  const isLedger = level === LEDGER_LEVEL;
  // An account moves only under another account one level up.
  const parentChoices = level > 1 ? accounts.filter((a) => a.level === level - 1).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })) : [];
  const suggested = account ? null : nextCode(parent, siblings);

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {account && level > 1 ? (
        <Field label={`${levelName(level - 1)} (parent)`} name="parentId" className="sm:col-span-2">
          <Select id="parentId" name="parentId" defaultValue={String(account.parentId ?? "")}>
            {parentChoices.map((choice) => (
              <option key={choice.id} value={choice.id}>
                {choice.code} — {choice.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <input type="hidden" name="parentId" value={parent?.id ?? ""} />
      )}

      <Field
        label="Code"
        name="code"
        hint={suggested ? `Leave empty to use ${suggested}.` : "Codes are unique in the organization."}
      >
        <Input id="code" name="code" defaultValue={account?.code ?? ""} placeholder={suggested ?? undefined} maxLength={30} />
      </Field>
      <Field label="Name" name="name" required>
        <Input id="name" name="name" defaultValue={account?.name ?? ""} maxLength={150} required autoFocus />
      </Field>

      {level === 1 && (
        <Field
          label="Nature"
          name="nature"
          required
          hint="Every account below a parent class shares its nature; it decides where it shows in the balance sheet."
          className="sm:col-span-2"
        >
          <Select id="nature" name="nature" defaultValue={account?.nature ?? ""} required>
            <option value="" disabled>
              Choose…
            </option>
            {ACCOUNT_NATURES.map((nature) => (
              <option key={nature} value={nature}>
                {nature}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {isLedger && (
        <>
          <Field label="Ledger type" name="ledgerType" hint="Bills are paid from and collected into Cash and Bank heads.">
            <Select id="ledgerType" name="ledgerType" defaultValue={account?.ledgerType ?? "General"}>
              {LEDGER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Subsidiary ledger"
            name="partyType"
            hint={
              account?.hasEntries
                ? "Vouchers are posted to this head, so this can't change."
                : "Supplier or Customer makes every line on this head name the party (e.g. Accounts Payable)."
            }
          >
            {account?.hasEntries ? (
              <>
                <input type="hidden" name="partyType" value={account.partyType ?? ""} />
                <Select id="partyType" value={account.partyType ?? ""} disabled>
                  <option value="">None</option>
                  {PARTY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}s
                    </option>
                  ))}
                </Select>
              </>
            ) : (
              <Select id="partyType" name="partyType" defaultValue={account?.partyType ?? ""}>
                <option value="">None</option>
                {PARTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}s
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </>
      )}

      <Field label="Sort order" name="sortOrder" hint="Lower numbers come first among siblings; then by code.">
        <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={String(account?.sortOrder ?? 0)} />
      </Field>
      <div className="flex items-end pb-3">
        <Checkbox
          name="isActive"
          defaultChecked={account?.isActive ?? parent?.isActive ?? true}
          label="In use (ticked)"
        />
      </div>
      <Field label="Description" name="description" className="sm:col-span-2">
        <Textarea id="description" name="description" rows={2} defaultValue={account?.description ?? ""} maxLength={500} />
      </Field>
    </div>
  );
}

function DeleteAccount({ account, onDone }: { account: ChartAccount; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Delete <span className="font-medium text-gray-800 dark:text-white/90">{account.code} {account.name}</span>? This cannot be
        undone. To stop using an account that has entries, clear its checkbox instead.
      </p>
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <button
          type="button"
          disabled={pending}
          className={cn(buttonClasses("danger"), "min-w-28")}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteAccountAction(account.id);
              if (result.status === "error") setError(result.message);
              else onDone();
            })
          }
        >
          {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
