"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Field, Input } from "@/core/forms/fields";
import { searchOrganizationClientOrganizationsAction } from "../actions";
import type { OrganizationClientOrganizationOption } from "../types";

const pageSize = 50;

function label(option: OrganizationClientOrganizationOption) {
  return `${option.nameEn}${option.code ? ` (${option.code})` : ""}${option.isActive ? "" : " — inactive"}`;
}

export function OrganizationClientOrganizationSelect({
  initialId,
  initialName,
}: {
  initialId: string | null;
  initialName: string | null;
}) {
  const [selectedId, setSelectedId] = useState(initialId ?? "");
  const [selectedLabel, setSelectedLabel] = useState(initialName ?? "");
  const [open, setOpen] = useState(!initialId);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<OrganizationClientOrganizationOption[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const sequence = useRef(0);

  useEffect(() => {
    const requestId = ++sequence.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await searchOrganizationClientOrganizationsAction(search, 0);
        if (requestId !== sequence.current) return;
        if (result.ok) {
          setItems(result.data.items);
          setTotalCount(result.data.totalCount);
          setOffset(result.data.offset);
          setError(undefined);
        } else setError(result.error.message);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  function loadMore() {
    const requestId = ++sequence.current;
    const nextOffset = offset + pageSize;
    startTransition(async () => {
      const result = await searchOrganizationClientOrganizationsAction(search, nextOffset);
      if (requestId !== sequence.current) return;
      if (result.ok) {
        setItems((current) => [...current, ...result.data.items]);
        setOffset(result.data.offset);
        setTotalCount(result.data.totalCount);
        setError(undefined);
      } else setError(result.error.message);
    });
  }

  return (
    <Field
      label="Organization"
      name="orgObjectId"
      required
      hint="Search by organization name, code, or UUID."
    >
      <input type="hidden" name="orgObjectId" value={selectedId} />
      {selectedId && !open ? (
        <div className="flex min-h-9 items-center justify-between gap-3 rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700">
          <span className="text-sm text-gray-800 dark:text-white/90">{selectedLabel || selectedId}</span>
          <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-brand-600 dark:text-brand-400">
            Change
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-300 p-2 dark:border-gray-700">
          <Input
            aria-label="Search organizations"
            type="search"
            placeholder="Search organizations…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoComplete="off"
          />
          <div className="mt-2 max-h-48 overflow-y-auto" role="listbox" aria-label="Organization options">
            {items.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={selectedId === option.objectId}
                key={option.objectId}
                onClick={() => {
                  setSelectedId(option.objectId);
                  setSelectedLabel(label(option));
                  setOpen(false);
                }}
                className="block w-full rounded px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              >
                {label(option)}
              </button>
            ))}
            {items.length === 0 && !pending && !error && (
              <p className="px-2 py-2 text-sm text-gray-500">No matching organizations.</p>
            )}
            {offset + items.length < totalCount && (
              <button
                type="button"
                disabled={pending}
                onClick={loadMore}
                className="w-full px-2 py-2 text-center text-sm font-medium text-brand-600 disabled:opacity-60 dark:text-brand-400"
              >
                {pending ? "Loading…" : "Load more organizations"}
              </button>
            )}
          </div>
          {error && <p role="alert" className="px-2 pt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
      )}
    </Field>
  );
}
