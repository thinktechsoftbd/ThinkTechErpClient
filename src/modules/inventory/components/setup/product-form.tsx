"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { FieldError, FormMessage } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { PRODUCT_TYPES, label, type Product, type ProductType, type TrackingType } from "../../types";

/** What the product form picks from (a slim copy of the inventory options). */
export type ProductFormOptions = {
  units: { id: number; code: string; name: string; nameLocal: string | null; isActive: boolean }[];
  categories: { id: number; path: string; isActive: boolean }[];
  brands: { id: number; name: string; isActive: boolean }[];
  /** `label` includes the rates, e.g. "VAT 15% (VAT 15%)". */
  taxGroups: { id: number; label: string; isActive: boolean }[];
};

type PackRow = { key: string; unitId: string; conversionFactor: string; salePrice: string };
type BarcodeRow = { key: string; unitId: string; barcode: string };
type AttributeRow = { key: string; name: string; value: string };

/** "base" or the key of the pack row that is the default unit. */
type DefaultPick = string;

const TRACKING_LABELS: Record<TrackingType, string> = {
  None: "None",
  Batch: "Batch (lot no.)",
  Serial: "Serial no.",
};

/** Common attribute names offered while typing. */
const ATTRIBUTE_SUGGESTIONS = ["npk", "active ingredient", "toxicity class", "formulation", "pack size", "size", "colour", "material", "model", "grade"];

const ATTRIBUTE_LIST_ID = "product-attribute-names";

// Keys for rows added in the browser (event handlers only); loaded rows use their index.
let rowSeed = 0;
const newKey = (prefix: string) => `${prefix}-new-${++rowSeed}`;

const smallControl = "h-9 px-3";
const headCell = "px-3 py-2 text-left text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400";
const bodyCell = "px-3 py-2 align-middle";

function unitLabel(unit: ProductFormOptions["units"][number]) {
  return `${unit.code} · ${unit.name}${unit.nameLocal ? ` (${unit.nameLocal})` : ""}${unit.isActive ? "" : " (inactive)"}`;
}

function initialPacks(value: Product | undefined): PackRow[] {
  if (!value) return [];
  return value.units
    .filter((unit) => unit.unitId !== value.baseUnitId)
    .map((unit, index) => ({
      key: `pack-${index}`,
      unitId: String(unit.unitId),
      conversionFactor: String(unit.conversionFactor),
      salePrice: unit.salePrice === null ? "" : String(unit.salePrice),
    }));
}

function initialDefault(value: Product | undefined, flag: "isPurchaseDefault" | "isSaleDefault"): DefaultPick {
  if (!value) return "base";
  const packs = value.units.filter((unit) => unit.unitId !== value.baseUnitId);
  const index = packs.findIndex((unit) => unit[flag]);
  return index >= 0 ? `pack-${index}` : "base";
}

function initialBarcodes(value: Product | undefined): BarcodeRow[] {
  if (!value) return [{ key: "barcode-0", unitId: "", barcode: "" }];
  return value.barcodes.map((item, index) => ({
    key: `barcode-${index}`,
    // The base unit shows as "" (a barcode without a unit is the base unit's).
    unitId: item.unitId === null || item.unitId === value.baseUnitId ? "" : String(item.unitId),
    barcode: item.barcode,
  }));
}

function initialAttributes(value: Product | undefined): AttributeRow[] {
  if (!value) return [];
  return Object.entries(value.attributes ?? {}).map(([name, text], index) => ({ key: `attribute-${index}`, name, value: text }));
}

function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-gray-100 pt-5 first:border-t-0 first:pt-0 dark:border-gray-800">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function RemoveButton({ onClick, label: text }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      title={text}
      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}

function AddRowButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <Plus className="size-4" aria-hidden /> {children}
    </Button>
  );
}

/**
 * Fields of the add/edit product modal (rendered inside its <ActionForm>). The pack, barcode and
 * attribute rows are kept in state and submitted as JSON in hidden inputs that saveProductAction parses.
 */
export function ProductForm({ value, options }: { value?: Product; options: ProductFormOptions }) {
  const [productType, setProductType] = useState<ProductType>(value?.productType ?? "Stock");
  const [trackingType, setTrackingType] = useState<TrackingType>(value?.trackingType ?? "None");
  const [hasExpiry, setHasExpiry] = useState(value?.hasExpiry ?? false);
  const [baseUnitId, setBaseUnitId] = useState(value ? String(value.baseUnitId) : "");
  const [packs, setPacks] = useState<PackRow[]>(() => initialPacks(value));
  const [purchaseDefault, setPurchaseDefault] = useState<DefaultPick>(() => initialDefault(value, "isPurchaseDefault"));
  const [saleDefault, setSaleDefault] = useState<DefaultPick>(() => initialDefault(value, "isSaleDefault"));
  const [barcodes, setBarcodes] = useState<BarcodeRow[]>(() => initialBarcodes(value));
  const [attributes, setAttributes] = useState<AttributeRow[]>(() => initialAttributes(value));
  /** A row added from the keyboard (Enter in a barcode) takes the focus. */
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const isStock = productType === "Stock";
  const effectiveTracking: TrackingType = isStock ? trackingType : "None";
  const effectiveExpiry = hasExpiry && effectiveTracking === "Batch";

  const unitById = new Map(options.units.map((unit) => [String(unit.id), unit]));
  const baseUnit = unitById.get(baseUnitId);
  const baseCode = baseUnit?.code ?? "base unit";
  const packCode = (unitId: string) => unitById.get(unitId)?.code ?? "pack";

  // ---- Row updates (all in event handlers)

  function changeBaseUnit(next: string) {
    setBaseUnitId(next);
    // The base unit can't also be a pack; clear rows that used it.
    setPacks((rows) => rows.map((row) => (row.unitId === next ? { ...row, unitId: "" } : row)));
    setBarcodes((rows) => rows.map((row) => (row.unitId === next ? { ...row, unitId: "" } : row)));
  }

  function updatePack(key: string, patch: Partial<PackRow>) {
    const previous = packs.find((row) => row.key === key);
    setPacks((rows) => rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
    if (previous && patch.unitId !== undefined && patch.unitId !== previous.unitId) {
      // Barcodes of the pack's old unit fall back to the base unit.
      setBarcodes((rows) => rows.map((row) => (row.unitId === previous.unitId ? { ...row, unitId: "" } : row)));
    }
  }

  function removePack(key: string) {
    const removed = packs.find((row) => row.key === key);
    setPacks((rows) => rows.filter((row) => row.key !== key));
    if (purchaseDefault === key) setPurchaseDefault("base");
    if (saleDefault === key) setSaleDefault("base");
    if (removed?.unitId) setBarcodes((rows) => rows.map((row) => (row.unitId === removed.unitId ? { ...row, unitId: "" } : row)));
  }

  function addBarcode(focus: boolean) {
    const key = newKey("barcode");
    setBarcodes((rows) => [...rows, { key, unitId: "", barcode: "" }]);
    if (focus) setFocusKey(key);
  }

  /** A scanner ends with Enter: start the next row instead of submitting the form. */
  function onBarcodeKeyDown(event: KeyboardEvent<HTMLInputElement>, row: BarcodeRow, isLast: boolean) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (isLast && row.barcode.trim()) addBarcode(true);
  }

  // ---- Serialized rows

  const packsJson = JSON.stringify(
    packs.map((row) => ({
      unitId: row.unitId,
      conversionFactor: row.conversionFactor,
      salePrice: row.salePrice,
      isPurchaseDefault: purchaseDefault === row.key,
      isSaleDefault: saleDefault === row.key,
    })),
  );
  const barcodesJson = JSON.stringify(barcodes.map((row) => ({ unitId: row.unitId, barcode: row.barcode })));
  const attributesJson = JSON.stringify(attributes.map((row) => ({ name: row.name, value: row.value })));

  const baseUnitChoices = options.units.filter((unit) => unit.isActive || String(unit.id) === baseUnitId);
  const packedUnits = packs.filter((row) => row.unitId);

  return (
    <div className="space-y-5">
      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" name="code" required hint="Unique, e.g. FERT-UREA-50.">
            <Input id="code" name="code" maxLength={50} defaultValue={value?.code} required />
          </Field>
          <Field label="Type" name="productType" required>
            <Select
              id="productType"
              name="productType"
              value={productType}
              onChange={(event) => {
                const next = event.target.value as ProductType;
                setProductType(next);
                if (next !== "Stock") {
                  setTrackingType("None");
                  setHasExpiry(false);
                }
              }}
              required
            >
              {PRODUCT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === "Stock" ? "Stock item" : label(type)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Name" name="name" required className="sm:col-span-2">
            <Input id="name" name="name" maxLength={250} defaultValue={value?.name} required />
          </Field>
          <Field label="Local name" name="nameLocal" hint="Bangla name for receipts and search." className="sm:col-span-2">
            <Input id="nameLocal" name="nameLocal" maxLength={250} defaultValue={value?.nameLocal ?? ""} lang="bn" />
          </Field>
          <Field label="Category" name="categoryId">
            <Select id="categoryId" name="categoryId" defaultValue={value?.categoryId ? String(value.categoryId) : ""}>
              <option value="">No category</option>
              {options.categories
                .filter((category) => category.isActive || category.id === value?.categoryId)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.path}
                    {category.isActive ? "" : " (inactive)"}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Brand" name="brandId">
            <Select id="brandId" name="brandId" defaultValue={value?.brandId ? String(value.brandId) : ""}>
              <option value="">No brand</option>
              {options.brands
                .filter((brand) => brand.isActive || brand.id === value?.brandId)
                .map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                    {brand.isActive ? "" : " (inactive)"}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Image URL" name="imageUrl" className="sm:col-span-2">
            <Input id="imageUrl" name="imageUrl" type="url" maxLength={500} defaultValue={value?.imageUrl ?? ""} placeholder="https://" />
          </Field>
        </div>
        <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be bought and sold)" />
      </Section>

      <Section
        title="Units & barcodes"
        description="Stock is kept in the base unit. Add packs that hold several base units, e.g. 1 bag = 50 kg, 1 box = 12 pcs."
      >
        <Field
          label="Base unit"
          name="baseUnitId"
          required
          hint={value ? "Can't change once the product has stock movements." : "The smallest unit you count, e.g. kg, pcs, feet."}
          className="sm:max-w-xs"
        >
          <Select id="baseUnitId" name="baseUnitId" value={baseUnitId} onChange={(event) => changeBaseUnit(event.target.value)} required>
            <option value="" disabled>
              Choose a unit
            </option>
            {baseUnitChoices.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unitLabel(unit)}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <div className="custom-scrollbar overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  <th className={headCell}>Pack unit</th>
                  <th className={headCell}>{baseCode} in 1 pack</th>
                  <th className={headCell}>Pack sale price</th>
                  <th className={cn(headCell, "text-center")}>Buy default</th>
                  <th className={cn(headCell, "text-center")}>Sell default</th>
                  <th className={headCell}>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className={cn(bodyCell, "font-medium text-gray-800 dark:text-white/90")}>
                    {baseUnit ? baseUnit.code : "—"} <span className="text-xs font-normal text-gray-500">(base)</span>
                  </td>
                  <td className={cn(bodyCell, "text-gray-500 dark:text-gray-400")}>1</td>
                  <td className={cn(bodyCell, "text-xs text-gray-500 dark:text-gray-400")}>The product&apos;s sale price</td>
                  <td className={cn(bodyCell, "text-center")}>
                    <input
                      type="radio"
                      name="purchaseDefaultPick"
                      checked={purchaseDefault === "base"}
                      onChange={() => setPurchaseDefault("base")}
                      aria-label="Buy in the base unit by default"
                      className="size-4 accent-brand-500"
                    />
                  </td>
                  <td className={cn(bodyCell, "text-center")}>
                    <input
                      type="radio"
                      name="saleDefaultPick"
                      checked={saleDefault === "base"}
                      onChange={() => setSaleDefault("base")}
                      aria-label="Sell in the base unit by default"
                      className="size-4 accent-brand-500"
                    />
                  </td>
                  <td className={bodyCell} />
                </tr>
                {packs.map((row) => {
                  const choices = options.units.filter(
                    (unit) =>
                      String(unit.id) !== baseUnitId &&
                      (unit.isActive || String(unit.id) === row.unitId) &&
                      !packs.some((other) => other.key !== row.key && other.unitId === String(unit.id)),
                  );
                  return (
                    <tr key={row.key}>
                      <td className={cn(bodyCell, "w-48")}>
                        <Select
                          value={row.unitId}
                          onChange={(event) => updatePack(row.key, { unitId: event.target.value })}
                          aria-label="Pack unit"
                          className={smallControl}
                        >
                          <option value="">Choose</option>
                          {choices.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unitLabel(unit)}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className={cn(bodyCell, "w-36")}>
                        <Input
                          value={row.conversionFactor}
                          onChange={(event) => updatePack(row.key, { conversionFactor: event.target.value })}
                          inputMode="decimal"
                          placeholder="e.g. 50"
                          aria-label={`${baseCode} in one ${packCode(row.unitId)}`}
                          className={smallControl}
                        />
                      </td>
                      <td className={cn(bodyCell, "w-36")}>
                        <Input
                          value={row.salePrice}
                          onChange={(event) => updatePack(row.key, { salePrice: event.target.value })}
                          inputMode="decimal"
                          placeholder="Optional"
                          aria-label={`Sale price of one ${packCode(row.unitId)}`}
                          className={smallControl}
                        />
                      </td>
                      <td className={cn(bodyCell, "text-center")}>
                        <input
                          type="radio"
                          name="purchaseDefaultPick"
                          checked={purchaseDefault === row.key}
                          onChange={() => setPurchaseDefault(row.key)}
                          aria-label={`Buy in ${packCode(row.unitId)} by default`}
                          className="size-4 accent-brand-500"
                        />
                      </td>
                      <td className={cn(bodyCell, "text-center")}>
                        <input
                          type="radio"
                          name="saleDefaultPick"
                          checked={saleDefault === row.key}
                          onChange={() => setSaleDefault(row.key)}
                          aria-label={`Sell in ${packCode(row.unitId)} by default`}
                          className="size-4 accent-brand-500"
                        />
                      </td>
                      <td className={cn(bodyCell, "w-10 text-right")}>
                        <RemoveButton onClick={() => removePack(row.key)} label="Remove pack" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {packedUnits.length > 0 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {packedUnits
                .map((row) => {
                  const factor = Number(row.conversionFactor.replace(/,/g, ""));
                  return `1 ${packCode(row.unitId)} = ${Number.isFinite(factor) && factor > 0 ? formatQuantity(factor) : "?"} ${baseCode}`;
                })
                .join(" · ")}
            </p>
          )}
          <FieldError name="units" />
          <div className="mt-3">
            <AddRowButton onClick={() => setPacks((rows) => [...rows, { key: newKey("pack"), unitId: "", conversionFactor: "", salePrice: "" }])}>
              Add pack
            </AddRowButton>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">Barcodes</p>
          {barcodes.length > 0 && (
            <div className="space-y-2">
              {barcodes.map((row, index) => (
                <div key={row.key} className="flex items-center gap-2">
                  <Input
                    value={row.barcode}
                    onChange={(event) => setBarcodes((rows) => rows.map((item) => (item.key === row.key ? { ...item, barcode: event.target.value } : item)))}
                    onKeyDown={(event) => onBarcodeKeyDown(event, row, index === barcodes.length - 1)}
                    maxLength={64}
                    placeholder="Scan or type"
                    aria-label={`Barcode ${index + 1}`}
                    autoFocus={row.key === focusKey}
                    className={cn(smallControl, "min-w-0 flex-1 font-mono")}
                  />
                  <div className="w-40 shrink-0">
                    <Select
                      value={row.unitId}
                      onChange={(event) => setBarcodes((rows) => rows.map((item) => (item.key === row.key ? { ...item, unitId: event.target.value } : item)))}
                      aria-label={`Unit of barcode ${index + 1}`}
                      className={smallControl}
                    >
                      <option value="">{baseUnit ? `${baseUnit.code} (base)` : "Base unit"}</option>
                      {packedUnits.map((pack) => (
                        <option key={pack.key} value={pack.unitId}>
                          {packCode(pack.unitId)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <RemoveButton onClick={() => setBarcodes((rows) => rows.filter((item) => item.key !== row.key))} label="Remove barcode" />
                </div>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">A pack can have its own barcode, e.g. the carton of 12.</p>
          <FieldError name="barcodes" />
          <div className="mt-3">
            <AddRowButton onClick={() => addBarcode(false)}>Add barcode</AddRowButton>
          </div>
        </div>
      </Section>

      <Section title="Stock & tracking" description={isStock ? undefined : "Only stock items are tracked by batch or serial number."}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Tracking"
            name="trackingType"
            hint={value ? "Can't change once the product has stock movements." : "Batch for fertilizer, seed and pesticide; serial for machines."}
          >
            <Select
              id="trackingType"
              value={effectiveTracking}
              disabled={!isStock}
              onChange={(event) => {
                const next = event.target.value as TrackingType;
                setTrackingType(next);
                if (next !== "Batch") setHasExpiry(false);
              }}
            >
              {(Object.keys(TRACKING_LABELS) as TrackingType[]).map((type) => (
                <option key={type} value={type}>
                  {TRACKING_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col justify-center gap-1 pt-1 sm:pt-7">
            <Checkbox
              checked={effectiveExpiry}
              disabled={effectiveTracking !== "Batch"}
              onChange={(event) => setHasExpiry(event.target.checked)}
              label="Has expiry date"
            />
            <FieldError name="hasExpiry" />
          </div>
          <Field label="Shelf life (days)" name="shelfLifeDays" hint="Optional, e.g. 730 for two years.">
            <Input
              id="shelfLifeDays"
              name="shelfLifeDays"
              inputMode="numeric"
              disabled={!effectiveExpiry}
              defaultValue={value?.shelfLifeDays ?? ""}
            />
          </Field>
          <div className="hidden sm:block" />
          <Field label={`Reorder level (${baseCode})`} name="reorderLevel" hint="Reorder Alert lists it at or below this.">
            <Input id="reorderLevel" name="reorderLevel" inputMode="decimal" defaultValue={value ? String(value.reorderLevel) : ""} placeholder="0" />
          </Field>
          <Field label={`Reorder quantity (${baseCode})`} name="reorderQuantity" hint="How much to buy each time.">
            <Input id="reorderQuantity" name="reorderQuantity" inputMode="decimal" defaultValue={value ? String(value.reorderQuantity) : ""} placeholder="0" />
          </Field>
        </div>
      </Section>

      <Section title="Pricing & tax">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Sale price per ${baseCode}`} name="salePrice">
            <Input id="salePrice" name="salePrice" inputMode="decimal" defaultValue={value ? String(value.salePrice) : ""} placeholder="0.00" />
          </Field>
          <Field label="MRP" name="mrp" hint="Printed maximum retail price (optional).">
            <Input id="mrp" name="mrp" inputMode="decimal" defaultValue={value?.mrp ?? ""} />
          </Field>
          <Field label="Purchase tax" name="purchaseTaxGroupId">
            <Select id="purchaseTaxGroupId" name="purchaseTaxGroupId" defaultValue={value?.purchaseTaxGroupId ? String(value.purchaseTaxGroupId) : ""}>
              <option value="">No tax</option>
              {options.taxGroups
                .filter((group) => group.isActive || group.id === value?.purchaseTaxGroupId)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Sale tax" name="saleTaxGroupId">
            <Select id="saleTaxGroupId" name="saleTaxGroupId" defaultValue={value?.saleTaxGroupId ? String(value.saleTaxGroupId) : ""}>
              <option value="">No tax</option>
              {options.taxGroups
                .filter((group) => group.isActive || group.id === value?.saleTaxGroupId)
                .map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.label}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        {value && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Last purchase cost: <span className="font-medium tabular-nums text-gray-700 dark:text-gray-300">{formatAmount(value.lastPurchaseCost)}</span>{" "}
            per {value.baseUnitCode} (set by purchases).
          </p>
        )}
      </Section>

      <Section title="Regulatory" description="For fertilizer, pesticide, seed and imported goods.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Generic name" name="genericName" hint="e.g. Urea, Imidacloprid 20% SL." className="sm:col-span-2">
            <Input id="genericName" name="genericName" maxLength={250} defaultValue={value?.genericName ?? ""} />
          </Field>
          <Field label="Registration no." name="registrationNo" hint="Government registration, if any.">
            <Input id="registrationNo" name="registrationNo" maxLength={100} defaultValue={value?.registrationNo ?? ""} />
          </Field>
          <Field label="HS code" name="hsCode" hint="Customs code for imports.">
            <Input id="hsCode" name="hsCode" maxLength={20} defaultValue={value?.hsCode ?? ""} />
          </Field>
          <Field label="Country of origin" name="countryOfOrigin" hint="2-letter code, e.g. BD, CN, IN.">
            <Input
              id="countryOfOrigin"
              name="countryOfOrigin"
              maxLength={2}
              defaultValue={value?.countryOfOrigin ?? ""}
              className="uppercase"
              autoCapitalize="characters"
            />
          </Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400">Attributes</p>
          {attributes.length > 0 && (
            <div className="space-y-2">
              {attributes.map((row, index) => (
                <div key={row.key} className="flex items-center gap-2">
                  <div className="w-44 shrink-0">
                    <Input
                      value={row.name}
                      onChange={(event) => setAttributes((rows) => rows.map((item) => (item.key === row.key ? { ...item, name: event.target.value } : item)))}
                      list={ATTRIBUTE_LIST_ID}
                      maxLength={100}
                      placeholder="Name, e.g. npk"
                      aria-label={`Attribute ${index + 1} name`}
                      className={smallControl}
                    />
                  </div>
                  <Input
                    value={row.value}
                    onChange={(event) => setAttributes((rows) => rows.map((item) => (item.key === row.key ? { ...item, value: event.target.value } : item)))}
                    maxLength={500}
                    placeholder="Value, e.g. 46-0-0"
                    aria-label={`Attribute ${index + 1} value`}
                    className={cn(smallControl, "min-w-0 flex-1")}
                  />
                  <RemoveButton onClick={() => setAttributes((rows) => rows.filter((item) => item.key !== row.key))} label="Remove attribute" />
                </div>
              ))}
            </div>
          )}
          <datalist id={ATTRIBUTE_LIST_ID}>
            {ATTRIBUTE_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            Free details, e.g. npk = 46-0-0 for fertilizer, toxicity class for pesticide, size for hardware.
          </p>
          <FieldError name="attributes" />
          <div className="mt-3">
            <AddRowButton onClick={() => setAttributes((rows) => [...rows, { key: newKey("attribute"), name: "", value: "" }])}>
              Add attribute
            </AddRowButton>
          </div>
        </div>
      </Section>

      {/* The form is long: repeat the result next to the buttons too. */}
      <FormMessage />

      <input type="hidden" name="units" value={packsJson} />
      <input type="hidden" name="barcodes" value={barcodesJson} />
      <input type="hidden" name="attributes" value={attributesJson} />
      <input type="hidden" name="trackingType" value={effectiveTracking} />
      <input type="hidden" name="hasExpiry" value={effectiveExpiry ? "on" : ""} />
    </div>
  );
}
