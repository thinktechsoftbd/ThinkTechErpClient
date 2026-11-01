"use client";

import { ChevronDown, ChevronRight, Eraser, FolderTree, ListTree, Plus, RotateCw, Save, Search, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Input, Label } from "@/core/forms/fields";
import type { ActionState } from "@/core/forms/action-state";
import { Alert } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { addAccountClassAction, deleteAccountClassAction, renameAccountClassAction } from "../actions/account-classes";
import {
  ACCOUNT_CLASS_MAX_NAME,
  type AccountClassKind,
  type AccountClassNode,
  type EditableAccountClassKind,
} from "../types";

// The chart of accounts tree on the acc_* tables, laid out like MediDesk's: the tree with search, expand and
// collapse on the left, the entry section (parent, code, name; Add, Update, Clear, Delete) on the right.

const childKind: Record<AccountClassKind, EditableAccountClassKind | null> = {
  parent: null,
  ac: "main",
  main: "map",
  map: "sub",
  sub: null,
};

const kindLabel: Record<AccountClassKind, string> = {
  parent: "parent class",
  ac: "account class",
  main: "main class",
  map: "map class",
  sub: "sub class",
};

const isEditable = (kind: AccountClassKind): kind is EditableAccountClassKind => kind === "main" || kind === "map" || kind === "sub";

const keyOf = (node: AccountClassNode) => `${node.kind}:${node.id}`;

const label = (node: AccountClassNode) => node.name || node.code || kindLabel[node.kind];

type Entry = { node: AccountClassNode; parent: AccountClassNode | null };

/** Every node with its parent, by key, so the selection is found again after the tree reloads. */
function indexTree(tree: AccountClassNode[]) {
  const entries = new Map<string, Entry>();
  const walk = (nodes: AccountClassNode[], parent: AccountClassNode | null) => {
    for (const node of nodes) {
      entries.set(keyOf(node), { node, parent });
      walk(node.children, node);
    }
  };
  walk(tree, null);
  return entries;
}

/** Nodes whose name or code contains the search, with their ancestors; a matching node keeps everything below it. */
function filterTree(nodes: AccountClassNode[], search: string): AccountClassNode[] {
  return nodes.flatMap((node) => {
    if ([node.name, node.code].some((value) => value?.toLowerCase().includes(search))) return [node];
    const children = filterTree(node.children, search);
    return children.length > 0 ? [{ ...node, children }] : [];
  });
}

export function AccountClassTree({ tree, canManage }: { tree: AccountClassNode[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  // Parent classes start open.
  const [open, setOpen] = useState<Set<string>>(() => new Set(tree.map(keyOf)));
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const entries = useMemo(() => indexTree(tree), [tree]);
  const selected = selectedKey ? (entries.get(selectedKey) ?? null) : null;
  const search = query.trim().toLowerCase();
  const visible = useMemo(() => (search ? filterTree(tree, search) : tree), [tree, search]);
  const addKind = selected ? childKind[selected.node.kind] : null;
  const editKind = selected && isEditable(selected.node.kind) ? selected.node.kind : null;

  function select(key: string) {
    setSelectedKey(key);
    setName("");
    setMessage(null);
  }

  function clearEntry() {
    setSelectedKey(null);
    setName("");
    setMessage(null);
  }

  function toggle(key: string) {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function expandAll() {
    setOpen(new Set([...entries.entries()].filter(([, entry]) => entry.node.children.length > 0).map(([key]) => key)));
  }

  function reload() {
    setQuery("");
    clearEntry();
    startTransition(() => router.refresh());
  }

  function run(action: () => Promise<ActionState>, onSuccess: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        setMessage({ tone: "error", text: result.message ?? "Something went wrong. Try again." });
        return;
      }
      onSuccess();
      setMessage({ tone: "success", text: result.message ?? "Saved." });
    });
  }

  /** The typed name, or an error for the entry section when it is missing or too long for that kind. */
  function checkedName(kind: EditableAccountClassKind) {
    const value = name.trim();
    const max = ACCOUNT_CLASS_MAX_NAME[kind];
    if (!value) setMessage({ tone: "error", text: "Name is required." });
    else if (value.length > max) setMessage({ tone: "error", text: `A ${kindLabel[kind]} name can be at most ${max} characters.` });
    else return value;
    return null;
  }

  function add() {
    if (!selected) return setMessage({ tone: "error", text: "Select a node in the tree first." });
    if (!addKind) {
      return setMessage({
        tone: "error",
        text: selected.node.kind === "sub" ? "Sub classes cannot have children." : "Select an account, main or map class to add under.",
      });
    }
    const value = checkedName(addKind);
    if (!value) return;
    const parent = selected.node;
    run(
      () => addAccountClassAction(addKind, parent.id, value),
      () => {
        setName("");
        // Open the parent so the new account shows.
        setOpen((previous) => new Set(previous).add(keyOf(parent)));
      },
    );
  }

  function update() {
    if (!selected || !editKind) return setMessage({ tone: "error", text: "Select a main, map or sub class to update." });
    const value = checkedName(editKind);
    if (!value) return;
    run(() => renameAccountClassAction(editKind, selected.node.id, value), clearEntry);
  }

  function remove() {
    if (!selected || !editKind) return setMessage({ tone: "error", text: "Select a main, map or sub class to delete." });
    if (!window.confirm(`Delete "${label(selected.node)}"?`)) return;
    run(() => deleteAccountClassAction(editKind, selected.node.id), clearEntry);
  }

  const parentText = selected?.parent ? [selected.parent.code, selected.parent.name].filter(Boolean).join(" · ") : "";
  const namePlaceholder = !selected
    ? "Name"
    : addKind && editKind
      ? `New ${kindLabel[addKind]} name, or new name for "${label(selected.node)}"`
      : addKind
        ? `New ${kindLabel[addKind]} name`
        : editKind
          ? `New name for "${label(selected.node)}"`
          : "Parent classes are fixed";

  return (
    <div className={cn("grid items-start gap-6", canManage && "xl:grid-cols-2")}>
      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="coa-search">Search</Label>
            <span className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <Input
                id="coa-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Account name or code…"
                className="pl-9"
              />
            </span>
          </div>
          <Button variant="outline" onClick={expandAll}>
            <FolderTree className="size-4" aria-hidden /> Expand All
          </Button>
          <Button variant="outline" onClick={() => setOpen(new Set())}>
            <ListTree className="size-4" aria-hidden /> Collapse All
          </Button>
          <Button variant="outline" onClick={reload} disabled={pending} title="Reload the tree" aria-label="Reload the tree">
            <RotateCw className={cn("size-4", pending && "animate-spin")} aria-hidden />
          </Button>
        </div>

        <div className="rounded-xl border border-gray-200 p-2 dark:border-gray-800">
          {visible.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {search ? `No account matches “${query.trim()}”.` : "No accounts found."}
            </p>
          ) : (
            <ul role="tree" aria-label="Chart of accounts">
              {visible.map((node) => (
                <TreeRow
                  key={keyOf(node)}
                  node={node}
                  level={0}
                  // While searching, every match is shown open.
                  isOpen={(key) => search !== "" || open.has(key)}
                  selectedKey={selectedKey}
                  onToggle={toggle}
                  onSelect={canManage ? select : undefined}
                />
              ))}
            </ul>
          )}
        </div>
      </Card>

      {canManage && (
        <Card className="p-5">
          <h2 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">Chart of Account Entry Section</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="coa-parent">Parent</Label>
              <Input
                id="coa-parent"
                readOnly
                value={parentText}
                placeholder="Select a node in the tree"
                className="bg-gray-50 dark:bg-white/[0.03]"
              />
            </div>
            <div>
              <Label htmlFor="coa-code">Code</Label>
              <Input
                id="coa-code"
                readOnly
                value={selected?.node.code ?? ""}
                placeholder="Auto generated"
                className="bg-gray-50 font-mono dark:bg-white/[0.03]"
              />
            </div>
            <div>
              <Label htmlFor="coa-name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="coa-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={namePlaceholder}
                disabled={!!selected && !addKind && !editKind}
                maxLength={100}
              />
            </div>
            {message && <Alert tone={message.tone}>{message.text}</Alert>}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button onClick={add} disabled={pending || !addKind}>
                <Plus className="size-4" aria-hidden /> Add
              </Button>
              <Button onClick={update} disabled={pending || !editKind}>
                <Save className="size-4" aria-hidden /> Update
              </Button>
              <Button variant="outline" onClick={clearEntry} disabled={pending}>
                <Eraser className="size-4" aria-hidden /> Clear
              </Button>
              <Button variant="danger" onClick={remove} disabled={pending || !editKind}>
                <Trash2 className="size-4" aria-hidden /> Delete
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select a node in the tree. Type a name and press Add to create a child under it (account class → main class → map
              class → sub class) with an auto generated code. Press Update to rename the selected node, or Delete to remove it.
              Nodes with children cannot be deleted.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function TreeRow({
  node,
  level,
  isOpen,
  selectedKey,
  onToggle,
  onSelect,
}: {
  node: AccountClassNode;
  level: number;
  isOpen: (key: string) => boolean;
  selectedKey: string | null;
  onToggle: (key: string) => void;
  /** Missing when the chart is read-only; parent classes only open and close. */
  onSelect?: (key: string) => void;
}) {
  const key = keyOf(node);
  const hasChildren = node.children.length > 0;
  const expanded = hasChildren && isOpen(key);
  const selectable = !!onSelect && node.kind !== "parent";
  const selected = selectable && selectedKey === key;
  // Account, main and map classes show how many accounts are under them.
  const count = node.kind !== "parent" && node.kind !== "sub" && hasChildren ? node.children.length : null;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} aria-selected={selectable ? selected : undefined}>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg py-1.5 pr-2 text-sm",
          selected
            ? "bg-brand-500 text-white"
            : node.kind === "parent"
              ? "font-semibold text-gray-800 hover:bg-gray-50 dark:text-white/90 dark:hover:bg-white/5"
              : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5",
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(key)}
            className="flex size-5 shrink-0 items-center justify-center rounded"
            aria-label={expanded ? `Collapse ${label(node)}` : `Expand ${label(node)}`}
          >
            {expanded ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
          </button>
        ) : (
          <span className="size-5 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => {
            if (onSelect && selectable) onSelect(key);
            else if (hasChildren) onToggle(key);
          }}
        >
          {node.code && (
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 font-mono text-xs",
                selected ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
              )}
            >
              {node.code}
            </span>
          )}
          <span className="truncate">{node.name || "—"}</span>
          {count !== null && (
            <span
              className={cn(
                "ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs",
                selected ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
              )}
            >
              {count}
            </span>
          )}
        </button>
      </div>
      {expanded && (
        <ul role="group">
          {node.children.map((child) => (
            <TreeRow
              key={keyOf(child)}
              node={child}
              level={level + 1}
              isOpen={isOpen}
              selectedKey={selectedKey}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
