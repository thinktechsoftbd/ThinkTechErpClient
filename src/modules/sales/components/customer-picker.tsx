"use client";

import { LoaderCircle, Search, UserPlus, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Label } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { cn } from "@/core/utils/cn";
import { formatAmount } from "@/core/utils/number";
import { addQuickCustomerAction } from "../actions/quick-customer";
import type { CustomerOption } from "../types";

/** Name - Address (address line 1, or the city), e.g. "Korim - Milonpur". */
const customerLabel = (customer: CustomerOption) => (customer.address ? `${customer.name} - ${customer.address}` : customer.name);

/**
 * Picks a customer on file by name, code, mobile, phone or address (shops look customers up by mobile), or
 * adds one on the spot with a name, phone and address. The list opens on a click, with the first parties.
 * Shows what the customer owes and the credit left.
 */
export function CustomerPicker({
  value,
  onChange,
  canAdd,
  required,
  includeInactive = false,
  includeSuppliers = false,
}: {
  value: CustomerOption | null;
  onChange: (customer: CustomerOption | null) => void;
  /** The user may add customers (SALES.M). */
  canAdd: boolean;
  required?: boolean;
  /** Inactive customers too (e.g. collecting what a closed account still owes); a sale can't use them. */
  includeInactive?: boolean;
  /** Every party of the supplier table, suppliers too (a sale to one makes them a customer). */
  includeSuppliers?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const requestRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // The first parties as soon as the list opens, then a new search 250 ms after the user stops typing.
  useEffect(() => {
    if (!open) return;
    const text = query.trim();
    const request = ++requestRef.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (text) params.set("search", text);
        if (includeSuppliers) params.set("includeSuppliers", "true");
        const response = await fetch(`/api/lookup/customers?${params}`, { headers: { Accept: "application/json" } });
        const data: unknown = await response.json().catch(() => []);
        if (request !== requestRef.current) return;
        setResults(Array.isArray(data) ? (data as CustomerOption[]).filter((c) => includeInactive || c.isActive) : []);
        setActive(0);
      } catch {
        if (request === requestRef.current) setResults([]);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    }, text ? 250 : 0);
    return () => clearTimeout(timer);
  }, [open, query, includeInactive, includeSuppliers]);

  useEffect(() => {
    function close(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function pick(customer: CustomerOption) {
    onChange(customer);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  if (value) {
    const owes = value.balance > 0;
    const limitText =
      value.creditLimit === null
        ? "No credit limit"
        : value.creditLimit === 0
          ? "Cash only (credit limit 0)"
          : `Credit left ${formatAmount(Math.max(0, value.availableCredit ?? 0))} of ${formatAmount(value.creditLimit)}`;
    return (
      <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800 dark:text-white/90" title={customerLabel(value)}>
              {customerLabel(value)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {value.code}
              {value.mobile && ` · ${value.mobile}`}
            </p>
          </div>
          <button type="button" aria-label="Change customer" onClick={() => onChange(null)} className="text-gray-400 hover:text-red-500">
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className={owes ? "font-medium text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}>
            {value.balance === 0 ? "Owes nothing" : owes ? `Owes ${formatAmount(value.balance)}` : `Advance ${formatAmount(-value.balance)}`}
          </span>
          <span className="text-gray-500 dark:text-gray-400">{limitText}</span>
        </div>
      </div>
    );
  }

  if (adding) return <QuickAddCustomer initialName={query} onAdded={pick} onCancel={() => setAdding(false)} />;

  return (
    <div ref={wrapperRef} className="relative">
      <Label htmlFor="customerSearch">
        Customer{required ? " *" : ""}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <Input
          id="customerSearch"
          className="pl-9"
          value={query}
          autoComplete="off"
          placeholder="Name, code, mobile or address"
          aria-expanded={open}
          aria-controls="customerResults"
          role="combobox"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (open && results[active]) pick(results[active]);
            } else if (event.key === "Escape") setOpen(false);
          }}
        />
        {loading && <LoaderCircle className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-gray-400" aria-hidden />}
      </div>
      {open && (
        <ul
          id="customerResults"
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-gray-900"
        >
          {results.length === 0 && !loading && (
            <li className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{query.trim() ? "No customer found." : "No customers yet."}</li>
          )}
          {results.length === 0 && loading && <li className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Loading…</li>}
          {results.map((customer, index) => (
            <li key={customer.id} role="option" aria-selected={index === active}>
              {/* Just Name - Address, e.g. "Korim - Milonpur": what's owed shows once picked. */}
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(customer)}
                title={customerLabel(customer)}
                className={cn(
                  "block w-full truncate px-3 py-2 text-left text-sm text-gray-800 dark:text-white/90",
                  index === active ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-gray-50 dark:hover:bg-white/5",
                )}
              >
                {customerLabel(customer)}
              </button>
            </li>
          ))}
        </ul>
      )}
      {canAdd && (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:underline">
          <UserPlus className="size-4" aria-hidden /> New customer
        </button>
      )}
    </div>
  );
}

function QuickAddCustomer({
  initialName,
  onAdded,
  onCancel,
}: {
  initialName: string;
  onAdded: (customer: CustomerOption) => void;
  onCancel: () => void;
}) {
  // A typed number goes to the mobile box, anything else to the name.
  const typedNumber = /^[+\d][\d\s-]*$/.test(initialName.trim());
  const [name, setName] = useState(typedNumber ? "" : initialName.trim());
  const [mobile, setMobile] = useState(typedNumber ? initialName.trim() : "");
  const [addressLine1, setAddressLine1] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const complete = Boolean(name.trim() && mobile.trim() && addressLine1.trim());

  function save() {
    setError(undefined);
    startTransition(async () => {
      const result = await addQuickCustomerAction({ name, mobile, addressLine1 });
      if (result.ok) onAdded(result.customer);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-200 p-3 dark:border-brand-500/30">
      <p className="text-sm font-medium text-gray-800 dark:text-white/90">New customer</p>
      <div>
        <Label htmlFor="quickCustomerName">Name *</Label>
        <Input id="quickCustomerName" value={name} maxLength={250} autoFocus onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="quickCustomerMobile">Mobile *</Label>
        <Input id="quickCustomerMobile" value={mobile} maxLength={30} inputMode="tel" placeholder="01XXXXXXXXX" onChange={(e) => setMobile(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="quickCustomerAddress">Address line 1 *</Label>
        <Input id="quickCustomerAddress" value={addressLine1} maxLength={250} onChange={(e) => setAddressLine1(e.target.value)} />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Added to the supplier table as a customer. Code, terms and credit limit can be set later on the Customers page.
      </p>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={pending || !complete} onClick={save} className={buttonClasses("primary", "sm")}>
          {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          Add customer
        </button>
        <button type="button" disabled={pending} onClick={onCancel} className={buttonClasses("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </div>
  );
}
