import type { ReactNode } from "react";
import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import type { InventorySetting } from "../../types";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({ name, label, hint, defaultChecked }: { name: string; label: string; hint: string; defaultChecked: boolean }) {
  return (
    <div>
      <Checkbox name={name} defaultChecked={defaultChecked} label={label} />
      <p className="mt-1 ml-6.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}

/** Fields of the inventory settings form (a page form, not a modal). */
export function InventorySettingsFields({
  settings,
  currencies,
  warehouses,
}: {
  settings: InventorySetting;
  /** Active values of the Currency lookup. */
  currencies: { id: number; name: string }[];
  warehouses: { id: number; name: string; isActive: boolean }[];
}) {
  const currencyChoices =
    settings.baseCurrencyLookupDataId !== null && !currencies.some((currency) => currency.id === settings.baseCurrencyLookupDataId)
      ? [...currencies, { id: settings.baseCurrencyLookupDataId, name: `${settings.baseCurrency ?? "Current"} (inactive)` }]
      : currencies;
  const warehouseChoices = warehouses.filter((warehouse) => warehouse.isActive || warehouse.id === settings.defaultWarehouseId);

  return (
    <>
      <Group title="General">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Base currency" name="baseCurrencyLookupDataId" required hint="Stock values and costs are kept in this currency.">
            <Select
              id="baseCurrencyLookupDataId"
              name="baseCurrencyLookupDataId"
              defaultValue={settings.baseCurrencyLookupDataId ? String(settings.baseCurrencyLookupDataId) : ""}
              required
            >
              <option value="" disabled>
                Choose a currency
              </option>
              {currencyChoices.map((currency) => (
                <option key={currency.id} value={currency.id}>
                  {currency.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fiscal year starts in" name="fiscalYearStartMonth" required hint="Bangladesh: July (July to June).">
            <Select id="fiscalYearStartMonth" name="fiscalYearStartMonth" defaultValue={String(settings.fiscalYearStartMonth || 7)} required>
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Default warehouse" name="defaultWarehouseId" hint="Pre-selected on new purchases and stock entries.">
            <Select id="defaultWarehouseId" name="defaultWarehouseId" defaultValue={settings.defaultWarehouseId ? String(settings.defaultWarehouseId) : ""}>
              <option value="">None</option>
              {warehouseChoices.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                  {warehouse.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expiry alert (days)" name="expiryAlertDays" required hint="Expiry Alert lists batches expiring within this many days.">
            <Input
              id="expiryAlertDays"
              name="expiryAlertDays"
              inputMode="numeric"
              defaultValue={String(settings.expiryAlertDays)}
              required
            />
          </Field>
        </div>
      </Group>

      <Group title="Stock rules">
        <div className="space-y-4">
          <Toggle
            name="pricesIncludeTax"
            label="Prices include VAT"
            hint="Prices you enter already include tax (VAT-inclusive)."
            defaultChecked={settings.pricesIncludeTax}
          />
          <Toggle
            name="allowNegativeStock"
            label="Allow negative stock"
            hint="Lets stock go below zero, e.g. when a sale is entered before its purchase."
            defaultChecked={settings.allowNegativeStock}
          />
          <Toggle
            name="requireApproval"
            label="Require approval"
            hint="Stock documents need approval before they are posted."
            defaultChecked={settings.requireApproval}
          />
        </div>
      </Group>
    </>
  );
}
