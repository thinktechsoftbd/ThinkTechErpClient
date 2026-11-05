"use client";

import { ListPlus, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { FieldError } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/utils/cn";
import { BILLING_PERIOD_TYPES, type SubscriptionPlan } from "../types";
import type { PickerOption } from "./subscription-fields";

type DetailRow = { key: number; id: number | null; description: string };
type FeatureRow = { key: number; id: number | null; title: string; isActive: boolean; details: DetailRow[] };

const muted = "text-gray-500 dark:text-gray-400";

// React keys for the editor's rows, unique while the page is open.
let keySeed = 0;
const key = () => ++keySeed;

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Up to 2 decimals, without trailing zeros: 20, 12.5, 799.99. */
function format2(value: number) {
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

/**
 * Fields of the add/edit subscription plan modal: the plan, its price (the discount as a percentage or as the price
 * after it, each worked out from the other), and its features with their details.
 */
export function SubscriptionPlanFields({ value, currencies }: { value?: SubscriptionPlan; currencies: PickerOption[] }) {
  const [regular, setRegular] = useState(value ? String(value.regularPrice) : "");
  const [percentage, setPercentage] = useState(value ? String(value.discountPercentage) : "0");
  const [price, setPrice] = useState(value ? String(value.discountPrice) : "");
  // Which of the two the user typed last: the other is worked out from it (and the API keeps the typed one).
  const [typed, setTyped] = useState<"percentage" | "price">("percentage");

  const priceFromPercentage = (regularText: string, percentageText: string) =>
    regularText.trim() ? format2((toNumber(regularText) * (100 - toNumber(percentageText))) / 100) : "";
  const percentageFromPrice = (regularText: string, priceText: string) => {
    const regularValue = toNumber(regularText);
    if (regularValue <= 0 || !priceText.trim()) return "0";
    return format2(Math.max(0, ((regularValue - toNumber(priceText)) * 100) / regularValue));
  };

  // Keep the saved currency selectable even if it's no longer offered (e.g. made inactive).
  const currencyOptions =
    value && !currencies.some((option) => option.id === value.currencyLookupDataId)
      ? [{ id: value.currencyLookupDataId, name: value.currencyName, isActive: false }, ...currencies]
      : currencies;

  return (
    <div className="space-y-5">
      <fieldset className="grid grid-cols-1 gap-5 rounded-xl border border-gray-200 p-4 md:grid-cols-2 dark:border-gray-800">
        <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-400">Plan</legend>
        <Field label="Plan name" name="nameEn" required>
          <Input id="nameEn" name="nameEn" maxLength={150} defaultValue={value?.nameEn} required />
        </Field>
        <Field label="Local name" name="nameLocal" hint="Optional, e.g. the Bangla name.">
          <Input id="nameLocal" name="nameLocal" maxLength={150} defaultValue={value?.nameLocal ?? ""} lang="bn" />
        </Field>
        <Field label="Short note" name="shortNote" className="md:col-span-2" hint="One or two lines shown with the plan.">
          <Textarea id="shortNote" name="shortNote" rows={2} maxLength={500} defaultValue={value?.shortNote ?? ""} />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 rounded-xl border border-gray-200 p-4 md:grid-cols-3 dark:border-gray-800">
        <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-400">Price</legend>
        <Field label="Regular price" name="regularPrice" required>
          <Input
            id="regularPrice"
            name="regularPrice"
            inputMode="decimal"
            value={regular}
            placeholder="0.00"
            required
            className="text-right tabular-nums"
            onChange={(event) => {
              const next = event.target.value;
              setRegular(next);
              if (typed === "price") setPercentage(percentageFromPrice(next, price));
              else setPrice(priceFromPercentage(next, percentage));
            }}
          />
        </Field>
        <Field label="Discount %" name="discountPercentage" hint="0 to 100.">
          {/* The API works the price out from a percentage; a typed price is sent with 0 % so it is kept exactly. */}
          <input type="hidden" name="discountPercentage" value={typed === "price" ? "0" : percentage} />
          <Input
            id="discountPercentage"
            inputMode="decimal"
            value={percentage}
            className="text-right tabular-nums"
            onChange={(event) => {
              setTyped("percentage");
              setPercentage(event.target.value);
              setPrice(priceFromPercentage(regular, event.target.value));
            }}
          />
        </Field>
        <Field label="Discount price" name="discountPrice" hint="The price after the discount.">
          <input type="hidden" name="discountPrice" value={price} />
          <Input
            id="discountPrice"
            inputMode="decimal"
            value={price}
            placeholder="0.00"
            className="text-right tabular-nums"
            onChange={(event) => {
              setTyped("price");
              setPrice(event.target.value);
              setPercentage(percentageFromPrice(regular, event.target.value));
            }}
          />
        </Field>
        <Field label="Currency" name="currencyLookupDataId" required hint="Values of the Currency lookup table.">
          <Select
            id="currencyLookupDataId"
            name="currencyLookupDataId"
            defaultValue={value ? String(value.currencyLookupDataId) : ""}
            required
          >
            <option value="" disabled>
              Choose a currency
            </option>
            {currencyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
                {option.isActive === false ? " (inactive)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Exchange rate" name="localExchangeRate" hint="Local currency per 1 unit.">
          <Input
            id="localExchangeRate"
            name="localExchangeRate"
            inputMode="decimal"
            defaultValue={value ? String(value.localExchangeRate) : "1"}
            className="text-right tabular-nums"
          />
        </Field>
        <Field label="Billing period" name="billingPeriodType" required>
          <Select id="billingPeriodType" name="billingPeriodType" defaultValue={value?.billingPeriodType ?? "Monthly"} required>
            {BILLING_PERIOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <PlanFeaturesEditor initial={value?.features ?? []} />

      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (offered to organizations)" className="flex" />
    </div>
  );
}

/**
 * The plan's features, each a title with detail lines under it. Saved features and details keep their id, so the
 * API updates them in place. Posted as JSON in the hidden "features" field; empty detail lines are left out.
 */
function PlanFeaturesEditor({ initial }: { initial: SubscriptionPlan["features"] }) {
  const [features, setFeatures] = useState<FeatureRow[]>(() =>
    initial.map((feature) => ({
      key: key(),
      id: feature.id,
      title: feature.title,
      isActive: feature.isActive,
      details: feature.details.map((detail) => ({ key: key(), id: detail.id, description: detail.description })),
    })),
  );

  const updateFeature = (featureKey: number, change: (feature: FeatureRow) => FeatureRow) =>
    setFeatures((current) => current.map((feature) => (feature.key === featureKey ? change(feature) : feature)));
  const addFeature = () =>
    setFeatures((current) => [...current, { key: key(), id: null, title: "", isActive: true, details: [{ key: key(), id: null, description: "" }] }]);
  const addDetail = (featureKey: number) =>
    updateFeature(featureKey, (feature) => ({ ...feature, details: [...feature.details, { key: key(), id: null, description: "" }] }));

  const payload = features.map((feature) => ({
    id: feature.id,
    title: feature.title.trim(),
    isActive: feature.isActive,
    details: feature.details
      .filter((detail) => detail.description.trim())
      .map((detail) => ({ id: detail.id, description: detail.description.trim() })),
  }));

  return (
    <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-400">Subscription features ({features.length})</legend>
      <input type="hidden" name="features" value={JSON.stringify(payload)} />

      {features.length === 0 ? (
        <p className={cn("rounded-xl border border-dashed border-gray-300 px-4 py-5 text-center text-sm dark:border-gray-700", muted)}>
          No features yet. Add what the plan includes, each with its details.
        </p>
      ) : (
        <ol className="space-y-3">
          {features.map((feature, index) => (
            <li key={feature.key} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-white/[0.02]">
              <div className="grid gap-2 sm:grid-cols-[1.75rem_minmax(0,1fr)_auto_2rem] sm:items-center">
                <span className="hidden size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 sm:flex dark:bg-brand-500/10 dark:text-brand-400">
                  {index + 1}
                </span>
                <Input
                  value={feature.title}
                  maxLength={200}
                  placeholder="Feature title, e.g. Inventory"
                  aria-label={`Feature ${index + 1} title`}
                  className="font-medium"
                  onChange={(event) => updateFeature(feature.key, (current) => ({ ...current, title: event.target.value }))}
                />
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300 accent-brand-500 dark:border-gray-700"
                    checked={feature.isActive}
                    onChange={(event) => updateFeature(feature.key, (current) => ({ ...current, isActive: event.target.checked }))}
                  />
                  Active
                </label>
                <button
                  type="button"
                  onClick={() => setFeatures((current) => current.filter((item) => item.key !== feature.key))}
                  className="inline-flex size-8 items-center justify-center justify-self-end rounded-lg text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                  aria-label={`Remove feature ${index + 1}`}
                  title="Remove the feature and its details"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              <div className="mt-2 space-y-2 sm:pl-9">
                <p className={cn("text-xs font-medium", muted)}>Feature details</p>
                {feature.details.map((detail, line) => (
                  <div key={detail.key} className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2">
                    <Input
                      value={detail.description}
                      maxLength={500}
                      placeholder="e.g. Unlimited products and warehouses"
                      aria-label={`Feature ${index + 1} detail ${line + 1}`}
                      onChange={(event) =>
                        updateFeature(feature.key, (current) => ({
                          ...current,
                          details: current.details.map((item) => (item.key === detail.key ? { ...item, description: event.target.value } : item)),
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateFeature(feature.key, (current) => ({ ...current, details: current.details.filter((item) => item.key !== detail.key) }))
                      }
                      className="inline-flex size-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      aria-label={`Remove feature ${index + 1} detail ${line + 1}`}
                      title="Remove the detail"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addDetail(feature.key)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                  <ListPlus className="size-4" aria-hidden /> Add detail
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Button variant="outline" size="sm" onClick={addFeature}>
        <Plus className="size-4" aria-hidden /> Add feature
      </Button>
      <FieldError name="features" />
    </fieldset>
  );
}
