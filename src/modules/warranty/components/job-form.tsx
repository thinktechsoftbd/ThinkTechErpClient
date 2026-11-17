"use client";

import Link from "next/link";
import { LoaderCircle, Search, X } from "lucide-react";
import { useState } from "react";
import { ProductSearch } from "@/core/documents/product-search";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import type { FormAction } from "@/core/forms/action-state";
import { Field, Input, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { isoToDmy } from "@/core/utils/date";
import { parseDecimal } from "@/core/utils/number";
import { CustomerPicker } from "@/modules/sales/components/customer-picker";
import type { CustomerOption } from "@/modules/sales/types";
import {
  JOB_TYPES,
  PRIORITIES,
  SERVICE_LOCATIONS,
  warrantyLabel,
  type JobType,
  type OptionItem,
  type ServiceJob,
  type ServiceJobUpsertRequest,
  type WarrantyCard,
  type WarrantyCheckResult,
} from "../types";
import { CoverageBadge } from "./status";

const muted = "text-gray-500 dark:text-gray-400";
const covered = (card: WarrantyCard | null) => card?.coverage === "InWarranty" || card?.coverage === "InReplacement";

/**
 * Opens or changes a service job. For a warranty claim, find the card (serial, warranty no., invoice or mobile): the
 * customer and the unit come from it. For a paid job, pick the customer on file or type a walk-in's name and mobile,
 * and describe the device as written on it.
 */
export function JobForm({
  action,
  deviceTypes,
  technicians,
  job,
  card: initialCard = null,
  customer: initialCustomer = null,
  initialType,
  cancelHref,
}: {
  action: FormAction;
  deviceTypes: OptionItem[];
  technicians: OptionItem[];
  /** The job being changed (null: a new job). */
  job?: ServiceJob | null;
  /** The warranty card the job is (to be) opened under. */
  card?: WarrantyCard | null;
  customer?: CustomerOption | null;
  initialType?: JobType;
  cancelHref: string;
}) {
  const [jobType, setJobType] = useState<JobType>(job?.jobType ?? initialType ?? (covered(initialCard) ? "Warranty" : "Paid"));
  const [card, setCard] = useState<WarrantyCard | null>(initialCard);
  const [customer, setCustomer] = useState<CustomerOption | null>(initialCustomer);
  const [walkIn, setWalkIn] = useState({
    name: job && !job.customerId ? (job.customerName ?? "") : "",
    mobile: job && !job.customerId ? (job.customerMobile ?? "") : "",
  });
  const [product, setProduct] = useState<{ id: number; name: string; code: string } | null>(
    job?.productId ? { id: job.productId, name: job.productName ?? "", code: job.productCode ?? "" } : null,
  );
  const [form, setForm] = useState({
    serviceLocation: job?.serviceLocation ?? "InShop",
    priority: job?.priority ?? "Normal",
    serviceAddress: job?.serviceAddress ?? "",
    deviceTypeLookupDataId: job?.deviceTypeLookupDataId ? String(job.deviceTypeLookupDataId) : "",
    serialNo: job?.serialNo ?? "",
    brandName: job?.brandName ?? "",
    modelName: job?.modelName ?? "",
    accessoriesReceived: job?.accessoriesReceived ?? "",
    physicalCondition: job?.physicalCondition ?? "",
    problemDescription: job?.problemDescription ?? "",
    warrantyVoidReason: job?.warrantyVoidReason ?? "",
    technicianUserId: job?.technicianUserId ? String(job.technicianUserId) : "",
    diagnosis: job?.diagnosis ?? "",
    estimatedAmount: job?.estimatedAmount ? String(job.estimatedAmount) : "",
    promisedDate: job?.promisedDate ?? "",
    remarks: job?.remarks ?? "",
  });
  const set = (name: keyof typeof form, value: string) => setForm((current) => ({ ...current, [name]: value }));
  const fromCard = card !== null && customer === null && !walkIn.mobile.trim() && !walkIn.name.trim();

  function payload(): ServiceJobUpsertRequest {
    const text = (value: string) => value.trim() || null;
    return {
      jobType,
      serviceLocation: form.serviceLocation,
      priority: form.priority,
      customerId: customer?.id ?? null,
      customerName: customer ? null : text(walkIn.name),
      customerMobile: customer ? null : text(walkIn.mobile),
      serviceAddress: text(form.serviceAddress),
      deviceTypeLookupDataId: Number(form.deviceTypeLookupDataId) || 0,
      productId: product?.id ?? null,
      serialNo: text(form.serialNo),
      brandName: text(form.brandName),
      modelName: text(form.modelName),
      accessoriesReceived: text(form.accessoriesReceived),
      physicalCondition: text(form.physicalCondition),
      problemDescription: form.problemDescription.trim(),
      warrantyRegistrationId: card?.id ?? null,
      warrantyVoidReason: jobType === "Paid" ? text(form.warrantyVoidReason) : null,
      technicianUserId: Number(form.technicianUserId) || null,
      diagnosis: text(form.diagnosis),
      estimatedAmount: parseDecimal(form.estimatedAmount) ?? 0,
      promisedDate: form.promisedDate || null,
      remarks: text(form.remarks),
    };
  }

  function pickCard(next: WarrantyCard) {
    setCard(next);
    setJobType(covered(next) ? "Warranty" : "Paid");
    // The customer and the unit come from the card unless chosen here.
    setCustomer(null);
    setWalkIn({ name: "", mobile: "" });
    setProduct(null);
    set("serialNo", "");
  }

  return (
    <ActionForm action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload())} />
      <FormMessage />

      <Card>
        <CardHeader title="Warranty or paid" description="A warranty claim needs the unit's warranty card; anything else is a paid job." />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Job type">
            {JOB_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={jobType === type}
                onClick={() => setJobType(type)}
                className={buttonClasses(jobType === type ? "primary" : "outline", "sm")}
              >
                {type === "Warranty" ? "Warranty claim" : "Paid service"}
              </button>
            ))}
          </div>
          {card ? (
            <SelectedCard card={card} onClear={() => setCard(null)} />
          ) : (
            <CardFinder onPick={pickCard} required={jobType === "Warranty"} />
          )}
          {jobType === "Paid" && covered(card) && (
            <Field label="Why the warranty doesn't apply" name="warrantyVoidReason" required hint="e.g. physical damage, liquid damage, seal broken.">
              <Input id="warrantyVoidReason" value={form.warrantyVoidReason} maxLength={500} onChange={(e) => set("warrantyVoidReason", e.target.value)} />
            </Field>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Customer" />
        <CardBody className="space-y-4">
          {fromCard && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              From the card: {card.customerName ?? "walk-in"}
              {card.customerMobile && ` · ${card.customerMobile}`}. Pick another customer below only if someone else brought it.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <CustomerPicker value={customer} onChange={setCustomer} canAdd={false} includeSuppliers endpoint="/api/lookup/warranty-customers" />
            </div>
            {!customer && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Walk-in name" name="customerName">
                  <Input id="customerName" value={walkIn.name} maxLength={250} onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} />
                </Field>
                <Field label="Mobile" name="customerMobile" required={!fromCard}>
                  <Input id="customerMobile" value={walkIn.mobile} maxLength={30} inputMode="tel" onChange={(e) => setWalkIn({ ...walkIn, mobile: e.target.value })} />
                </Field>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Where" name="serviceLocation">
              <Select id="serviceLocation" value={form.serviceLocation} onChange={(e) => set("serviceLocation", e.target.value)}>
                {SERVICE_LOCATIONS.map((value) => (
                  <option key={value} value={value}>
                    {warrantyLabel(value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" name="priority">
              <Select id="priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            {form.serviceLocation === "OnSite" && (
              <Field label="Address" name="serviceAddress" required>
                <Input id="serviceAddress" value={form.serviceAddress} maxLength={500} onChange={(e) => set("serviceAddress", e.target.value)} />
              </Field>
            )}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Device" description={card ? "The unit on the card, unless you name another one here." : "As written on the device; pick the product if it's one you sell."} />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Device type" name="deviceTypeLookupDataId" required>
              <Select id="deviceTypeLookupDataId" value={form.deviceTypeLookupDataId} onChange={(e) => set("deviceTypeLookupDataId", e.target.value)} required>
                <option value="">Choose…</option>
                {deviceTypes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Brand" name="brandName">
              <Input id="brandName" value={form.brandName} maxLength={100} placeholder="e.g. HP, Hikvision" onChange={(e) => set("brandName", e.target.value)} />
            </Field>
            <Field label="Model" name="modelName">
              <Input id="modelName" value={form.modelName} maxLength={150} onChange={(e) => set("modelName", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product (optional)" name="productId" hint="When the device is a product you sell.">
              {product ? (
                <div className="flex h-9 items-center justify-between rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700">
                  <span className="truncate text-gray-800 dark:text-white/90">
                    {product.name} <span className={muted}>({product.code})</span>
                  </span>
                  <button type="button" aria-label="Remove product" onClick={() => setProduct(null)} className="text-gray-400 hover:text-red-500">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ) : (
                <ProductSearch onPick={(p) => setProduct({ id: p.id, name: p.name, code: p.code })} placeholder="Search product by name or code" />
              )}
            </Field>
            <Field label="Serial no." name="serialNo" hint={card?.serialNo && !form.serialNo ? `From the card: ${card.serialNo}` : undefined}>
              <Input id="serialNo" value={form.serialNo} maxLength={100} onChange={(e) => set("serialNo", e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Accessories received" name="accessoriesReceived" hint="e.g. charger, bag, battery.">
              <Input id="accessoriesReceived" value={form.accessoriesReceived} maxLength={500} onChange={(e) => set("accessoriesReceived", e.target.value)} />
            </Field>
            <Field label="Physical condition" name="physicalCondition" hint="Scratches, cracks, missing screws, ...">
              <Input id="physicalCondition" value={form.physicalCondition} maxLength={1000} onChange={(e) => set("physicalCondition", e.target.value)} />
            </Field>
          </div>
          <Field label="Problem reported" name="problemDescription" required>
            <Textarea id="problemDescription" value={form.problemDescription} maxLength={2000} rows={3} onChange={(e) => set("problemDescription", e.target.value)} required />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Work" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Technician" name="technicianUserId">
              <Select id="technicianUserId" value={form.technicianUserId} onChange={(e) => set("technicianUserId", e.target.value)}>
                <option value="">Not assigned</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Estimate" name="estimatedAmount" hint="Quoted to the customer (paid jobs).">
              <Input id="estimatedAmount" value={form.estimatedAmount} inputMode="decimal" onChange={(e) => set("estimatedAmount", e.target.value)} />
            </Field>
            <Field label="Promised for" name="promisedDate">
              <Input id="promisedDate" type="date" value={form.promisedDate} onChange={(e) => set("promisedDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Diagnosis" name="diagnosis">
            <Textarea id="diagnosis" value={form.diagnosis} maxLength={2000} rows={2} onChange={(e) => set("diagnosis", e.target.value)} />
          </Field>
          <Field label="Remarks" name="remarks">
            <Input id="remarks" value={form.remarks} maxLength={1000} onChange={(e) => set("remarks", e.target.value)} />
          </Field>
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href={cancelHref} className={buttonClasses("ghost")}>
          Cancel
        </Link>
        <SubmitButton className="min-w-36" pendingLabel="Saving…">
          {job ? "Save changes" : "Open job"}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function SelectedCard({ card, onClear }: { card: WarrantyCard; onClear: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="min-w-0 space-y-1 text-sm">
        <p className="flex flex-wrap items-center gap-2 font-medium text-gray-800 dark:text-white/90">
          {card.warrantyNo} <CoverageBadge coverage={card.coverage} />
        </p>
        <p className={muted}>
          {card.productName}
          {card.serialNo && ` · SN ${card.serialNo}`} · {card.customerName ?? "walk-in"}
          {card.customerMobile && ` (${card.customerMobile})`}
        </p>
        <p className={muted}>
          Sold {isoToDmy(card.startDate)}
          {card.invoiceNo && ` on ${card.invoiceNo}`} · warranty to {isoToDmy(card.endDate)}
          {card.replacementEndDate && `, replacement to ${isoToDmy(card.replacementEndDate)}`}
        </p>
      </div>
      <button type="button" aria-label="Remove card" onClick={onClear} className="text-gray-400 hover:text-red-500">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Finds warranty cards by serial, warranty no., invoice no. or mobile and lets the user pick one. */
function CardFinder({ onPick, required }: { onPick: (card: WarrantyCard) => void; required: boolean }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [cards, setCards] = useState<WarrantyCard[] | null>(null);

  async function find() {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/lookup/warranty-check?q=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } });
      const data = (await response.json().catch(() => null)) as (WarrantyCheckResult & { error?: string }) | null;
      if (!response.ok || !data) {
        setError(data?.error ?? "Couldn't search the warranty cards.");
        setCards(null);
      } else setCards(data.cards);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Warranty card" name="warrantyRegistrationId" required={required} hint="Serial no., warranty no., invoice no. or the customer's mobile.">
        <div className="flex gap-2">
          <Input
            id="warrantyRegistrationId"
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void find();
              }
            }}
          />
          <button type="button" onClick={() => void find()} disabled={loading || !query.trim()} className={buttonClasses("outline", "sm", "h-9 shrink-0")}>
            {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
            Find
          </button>
        </div>
      </Field>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {cards && cards.length === 0 && <p className={cn("text-sm", muted)}>No warranty card found. A unit bought elsewhere is a paid job.</p>}
      {cards && cards.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          {cards.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onPick(c)} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5">
                <span className="min-w-0">
                  <span className="font-medium text-gray-800 dark:text-white/90">{c.warrantyNo}</span>{" "}
                  <span className={muted}>
                    {c.productName}
                    {c.serialNo && ` · SN ${c.serialNo}`} · {c.customerName ?? c.customerMobile ?? "walk-in"} · to {isoToDmy(c.endDate)}
                  </span>
                </span>
                <CoverageBadge coverage={c.coverage} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
