"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/core/forms/fields";
import {
  BILLING_PERIOD_TYPES,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_TYPES,
  type BillingPeriodType,
  type Subscription,
} from "../types";

export type PickerOption = { id: number; name: string; isActive?: boolean };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function toNumber(value: string) {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Same rule as the API: start + period × count − 1 day (month ends clamp, like .NET AddMonths). */
function defaultEndDate(start: string, period: BillingPeriodType, count: number) {
  if (!DATE_PATTERN.test(start) || !Number.isInteger(count) || count < 1) return "";
  const [year, month, day] = start.split("-").map(Number);
  const monthIndex = month - 1 + (period === "Yearly" ? count * 12 : count);
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = monthIndex % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDay)));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function OptionList({ options, current }: { options: PickerOption[]; current?: PickerOption }) {
  // Keep the saved choice selectable even if it's no longer offered (e.g. an inactive currency).
  const all = current && !options.some((option) => option.id === current.id) ? [current, ...options] : options;
  return (
    <>
      {all.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
          {option.isActive === false ? " (inactive)" : ""}
        </option>
      ))}
    </>
  );
}

const amountFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Fields of the add/edit subscription modal, with the end date and total calculated as you type. */
export function SubscriptionFields({
  value,
  organizations,
  modules,
  currencies,
}: {
  value?: Subscription;
  organizations: PickerOption[];
  modules: PickerOption[];
  currencies: PickerOption[];
}) {
  const [period, setPeriod] = useState<BillingPeriodType>(value?.billingPeriodType ?? "Monthly");
  const [count, setCount] = useState(String(value?.billingPeriodCount ?? 1));
  const [startDate, setStartDate] = useState(value?.startDate ?? todayIso());
  const [endDate, setEndDate] = useState(value?.endDate ?? "");
  const [currencyId, setCurrencyId] = useState(value ? String(value.currencyLookupDataId) : "");
  const [subtotal, setSubtotal] = useState(value ? String(value.subtotalAmount) : "");
  const [percentage, setPercentage] = useState(value ? String(value.discountPercentage) : "0");
  const [discount, setDiscount] = useState(value ? String(value.discountAmount) : "0");
  const [vat, setVat] = useState(value ? String(value.vatAmount) : "0");

  const autoEndDate = defaultEndDate(startDate, period, Number(count));
  const subtotalValue = toNumber(subtotal);
  const percentageValue = toNumber(percentage);
  const discountValue = percentageValue > 0 ? round2((subtotalValue * percentageValue) / 100) : toNumber(discount);
  const total = round2(subtotalValue - discountValue + toNumber(vat));
  const currencyName = [...currencies, ...(value ? [{ id: value.currencyLookupDataId, name: value.currencyName }] : [])].find(
    (option) => String(option.id) === currencyId,
  )?.name;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Organization" name="organizationId" required>
          <Select id="organizationId" name="organizationId" defaultValue={value ? String(value.organizationId) : ""} required>
            <option value="" disabled>
              Choose an organization
            </option>
            <OptionList
              options={organizations}
              current={value && { id: value.organizationId, name: value.organizationName }}
            />
          </Select>
        </Field>
        <Field label="Module" name="subscriptionModuleId" required>
          <Select
            id="subscriptionModuleId"
            name="subscriptionModuleId"
            defaultValue={value ? String(value.subscriptionModuleId) : ""}
            required
          >
            <option value="" disabled>
              Choose a module
            </option>
            <OptionList options={modules} current={value && { id: value.subscriptionModuleId, name: value.moduleName }} />
          </Select>
        </Field>
        <Field label="Subscription type" name="subscriptionType" required>
          <Select id="subscriptionType" name="subscriptionType" defaultValue={value?.subscriptionType ?? "Premium"} required>
            {SUBSCRIPTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" name="status" required>
          <Select id="status" name="status" defaultValue={value?.status ?? "Active"} required>
            {SUBSCRIPTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="grid grid-cols-1 gap-5 rounded-xl border border-gray-200 p-4 md:grid-cols-4 dark:border-gray-800">
        <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-400">Billing period</legend>
        <Field label="Period" name="billingPeriodType" required>
          <Select
            id="billingPeriodType"
            name="billingPeriodType"
            value={period}
            onChange={(event) => setPeriod(event.target.value as BillingPeriodType)}
          >
            {BILLING_PERIOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Count" name="billingPeriodCount" required>
          <Input
            id="billingPeriodCount"
            name="billingPeriodCount"
            type="number"
            min={1}
            max={120}
            value={count}
            onChange={(event) => setCount(event.target.value)}
            required
          />
        </Field>
        <Field label="Start date" name="startDate" required>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            required
          />
        </Field>
        <Field label="End date" name="endDate" hint={autoEndDate ? `Empty = ${autoEndDate}` : "Empty = calculated"}>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            min={DATE_PATTERN.test(startDate) ? startDate : undefined}
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </Field>
      </fieldset>

      <fieldset className="grid grid-cols-1 gap-5 rounded-xl border border-gray-200 p-4 md:grid-cols-3 dark:border-gray-800">
        <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-400">Amount</legend>
        <Field label="Currency" name="currencyLookupDataId" required hint="Values of the Currency lookup table.">
          <Select
            id="currencyLookupDataId"
            name="currencyLookupDataId"
            value={currencyId}
            onChange={(event) => setCurrencyId(event.target.value)}
            required
          >
            <option value="" disabled>
              Choose a currency
            </option>
            <OptionList
              options={currencies}
              current={value && { id: value.currencyLookupDataId, name: value.currencyName }}
            />
          </Select>
        </Field>
        <Field label="Exchange rate" name="localExchangeRate" hint="Local currency per 1 unit.">
          <Input
            id="localExchangeRate"
            name="localExchangeRate"
            inputMode="decimal"
            defaultValue={value ? String(value.localExchangeRate) : "1"}
          />
        </Field>
        <Field label="Subtotal" name="subtotalAmount" required>
          <Input
            id="subtotalAmount"
            name="subtotalAmount"
            inputMode="decimal"
            value={subtotal}
            onChange={(event) => setSubtotal(event.target.value)}
            placeholder="0.00"
            required
          />
        </Field>
        <Field label="Discount %" name="discountPercentage" hint="Above 0, the amount is calculated.">
          <Input
            id="discountPercentage"
            name="discountPercentage"
            inputMode="decimal"
            value={percentage}
            onChange={(event) => setPercentage(event.target.value)}
          />
        </Field>
        <Field label="Discount amount" name="discountAmount">
          <Input
            id="discountAmount"
            name="discountAmount"
            inputMode="decimal"
            value={percentageValue > 0 ? amountFormat.format(discountValue) : discount}
            onChange={(event) => setDiscount(event.target.value)}
            disabled={percentageValue > 0}
          />
        </Field>
        <Field label="VAT amount" name="vatAmount">
          <Input id="vatAmount" name="vatAmount" inputMode="decimal" value={vat} onChange={(event) => setVat(event.target.value)} />
        </Field>
      </fieldset>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-4 dark:bg-white/[0.03]">
        <dt className="text-gray-500 dark:text-gray-400">Subtotal</dt>
        <dd className="text-right font-medium sm:text-left">{amountFormat.format(subtotalValue)}</dd>
        <dt className="text-gray-500 dark:text-gray-400">− Discount</dt>
        <dd className="text-right font-medium sm:text-left">{amountFormat.format(discountValue)}</dd>
        <dt className="text-gray-500 dark:text-gray-400">+ VAT</dt>
        <dd className="text-right font-medium sm:text-left">{amountFormat.format(toNumber(vat))}</dd>
        <dt className="font-semibold text-gray-800 dark:text-white/90">Total</dt>
        <dd className={`text-right font-semibold sm:text-left ${total < 0 ? "text-red-600" : "text-gray-800 dark:text-white/90"}`}>
          {amountFormat.format(total)} {currencyName ?? ""}
        </dd>
      </dl>
    </div>
  );
}
