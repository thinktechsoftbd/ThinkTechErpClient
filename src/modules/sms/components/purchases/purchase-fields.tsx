"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/core/forms/fields";
import { formatAmount, formatQuantity, parseDecimal, round, todayIso } from "@/core/utils/number";
import type { LookupOption } from "@/modules/settings/types";
import { LOCAL_CURRENCY, isLocalCurrency, providerLabel, type SmsProvider, type SmsPurchase } from "../../types";

const wide = "sm:col-span-2";

/** The stored total when it differs from quantity × unit price; empty keeps it worked out. */
function initialTotal(value: SmsPurchase | undefined) {
  if (!value) return "";
  return round(value.smsQuantity * value.unitPrice, 2) === value.totalAmount ? "" : String(value.totalAmount);
}

/**
 * Fields of the record/edit purchase modal: active providers (plus the current one), the currency
 * (BDT by default) and, for another currency, its rate to BDT, with a live total in BDT.
 */
export function PurchaseFields({
  value,
  providers,
  currencies,
}: {
  value?: SmsPurchase;
  /** Every provider; inactive ones are offered only when the purchase already uses them. */
  providers: SmsProvider[];
  /** Active values of the Currency lookup list. */
  currencies: LookupOption[];
}) {
  const providerOptions = providers.filter((provider) => provider.isActive || provider.id === value?.providerId);
  const defaultProviderId = value?.providerId ?? (providerOptions.length === 1 ? providerOptions[0].id : undefined);
  const currencyOptions =
    value && !currencies.some((currency) => currency.id === value.currencyId)
      ? [...currencies, { id: value.currencyId, name: value.currency }]
      : currencies;
  const localCurrencyId = currencyOptions.find((currency) => isLocalCurrency(currency.name))?.id;

  const [currencyId, setCurrencyId] = useState(String(value?.currencyId ?? localCurrencyId ?? currencyOptions[0]?.id ?? ""));
  const [quantity, setQuantity] = useState(value ? String(value.smsQuantity) : "");
  const [unitPrice, setUnitPrice] = useState(value ? String(value.unitPrice) : "");
  const [total, setTotal] = useState(initialTotal(value));
  const [rate, setRate] = useState(value && !isLocalCurrency(value.currency) ? String(value.localExchangeRate) : "");

  const currency = currencyOptions.find((option) => String(option.id) === currencyId)?.name ?? "";
  const local = isLocalCurrency(currency);
  const quantityValue = parseDecimal(quantity);
  const priceValue = parseDecimal(unitPrice);
  const worked = quantityValue !== null && priceValue !== null ? round(quantityValue * priceValue, 2) : null;
  const totalValue = parseDecimal(total) ?? worked;
  const rateValue = local ? 1 : parseDecimal(rate);
  const localTotal = totalValue !== null && rateValue !== null ? round(totalValue * rateValue, 2) : null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Provider" name="providerId" required>
        <Select id="providerId" name="providerId" defaultValue={defaultProviderId ? String(defaultProviderId) : ""} required>
          <option value="" disabled>
            Choose a provider
          </option>
          {providerOptions.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {`${providerLabel(provider)}${provider.isActive ? "" : " (inactive)"}`}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Purchase date" name="purchaseDate" required>
        <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={value?.purchaseDate ?? todayIso()} required />
      </Field>
      <Field label="Invoice no" name="invoiceNumber">
        <Input id="invoiceNumber" name="invoiceNumber" maxLength={100} defaultValue={value?.invoiceNumber ?? ""} autoComplete="off" />
      </Field>
      <Field label="Reference" name="referenceNumber" hint="E.g. the payment or transaction number.">
        <Input id="referenceNumber" name="referenceNumber" maxLength={150} defaultValue={value?.referenceNumber ?? ""} autoComplete="off" />
      </Field>
      <Field label="SMS quantity" name="smsQuantity" required>
        <Input
          id="smsQuantity"
          name="smsQuantity"
          type="number"
          min={1}
          step={1}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          required
        />
      </Field>
      <Field
        label="Currency"
        name="currencyId"
        required
        hint={currencyOptions.length === 0 ? "Add currencies in Settings → Lookup Data → Currency." : undefined}
      >
        <Select id="currencyId" name="currencyId" value={currencyId} onChange={(event) => setCurrencyId(event.target.value)} required>
          {currencyOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={`Unit price${currency ? ` (${currency})` : ""}`} name="unitPrice" required hint="The price of one SMS.">
        <Input
          id="unitPrice"
          name="unitPrice"
          inputMode="decimal"
          value={unitPrice}
          onChange={(event) => setUnitPrice(event.target.value)}
          placeholder="0.00"
          required
        />
      </Field>
      <Field label={`Total${currency ? ` (${currency})` : ""}`} name="totalAmount" hint="Leave empty for quantity × unit price.">
        <Input
          id="totalAmount"
          name="totalAmount"
          inputMode="decimal"
          value={total}
          onChange={(event) => setTotal(event.target.value)}
          placeholder={worked === null ? "Quantity × unit price" : formatAmount(worked)}
        />
      </Field>
      {local ? (
        <input type="hidden" name="localExchangeRate" value="1" />
      ) : (
        <Field
          label={`Exchange rate (${LOCAL_CURRENCY} per 1 ${currency || "unit"})`}
          name="localExchangeRate"
          required
          hint={`What 1 ${currency || "unit"} cost in ${LOCAL_CURRENCY} when bought.`}
        >
          <Input
            id="localExchangeRate"
            name="localExchangeRate"
            inputMode="decimal"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            placeholder="e.g. 122.50"
            required
          />
        </Field>
      )}
      <div
        className={`rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03] ${local ? wide : ""}`}
        aria-live="polite"
      >
        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">Total in {LOCAL_CURRENCY}</p>
        <p className="mt-1 text-lg font-semibold text-gray-800 tabular-nums dark:text-white/90">
          {localTotal === null ? "—" : `${formatAmount(localTotal)} ${LOCAL_CURRENCY}`}
        </p>
        {!local && totalValue !== null && rateValue !== null && (
          <p className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
            {formatAmount(totalValue)} {currency} × {formatQuantity(rateValue)}
          </p>
        )}
      </div>
      <Field label="Remarks" name="remarks" className={wide}>
        <Textarea id="remarks" name="remarks" rows={2} maxLength={2000} defaultValue={value?.remarks ?? ""} />
      </Field>
    </div>
  );
}
