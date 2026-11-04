"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Field, Input, Select } from "@/core/forms/fields";
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
      <div className="space-y-2">
        <Input
          aria-label="Search organizations"
          type="search"
          placeholder="Search organizations…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoComplete="off"
        />
        <Select
          name="orgObjectId"
          required
          value={selectedId}
          onChange={(event) => {
            const value = event.target.value;
            const option = items.find((candidate) => candidate.objectId === value);
            setSelectedId(value);
            setSelectedLabel(option ? label(option) : value === initialId ? initialName ?? value : "");
          }}
        >
          <option value="">Choose an organization</option>
          {initialId && !items.some((option) => option.objectId === initialId) && (
            <option value={initialId}>{initialName ?? initialId}</option>
          )}
          {items.map((option) => <option key={option.objectId} value={option.objectId}>{label(option)}</option>)}
        </Select>
        {selectedLabel && <p className="text-xs text-gray-500">Selected: {selectedLabel}</p>}
        {items.length === 0 && !pending && !error && <p className="text-xs text-gray-500">No matching organizations.</p>}
        {offset + items.length < totalCount && (
          <button
            type="button"
            disabled={pending}
            onClick={loadMore}
            className="text-sm font-medium text-brand-600 disabled:opacity-60 dark:text-brand-400"
          >
            {pending ? "Loading…" : "Load more organizations"}
          </button>
        )}
        {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </Field>
  );
}
