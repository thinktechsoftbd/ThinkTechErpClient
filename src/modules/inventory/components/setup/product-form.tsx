"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { FieldError, useFormState } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/utils/cn";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { PRODUCT_TYPES, label, type Product, type ProductType, type TrackingType } from "../../types";
import { ProductImages } from "./product-images";
import { TagPicker, type TagChoice } from "./tag-picker";

/** What the product form picks from (a slim copy of the inventory options). */
export type ProductFormOptions = {
  units: { id: number; code: string; name: string; nameLocal: string | null; isActive: boolean }[];
  categories: { id: number; path: string; isActive: boolean }[];
  brands: { id: number; name: string; isActive: boolean }[];
  /** `label` includes the rates, e.g. "VAT 15% (VAT 15%)". */
  taxGroups: { id: number; label: string; isActive: boolean }[];
  /** Website badges and the tags the organization's products use. */
  tags: TagChoice[];
};

type PackRow = { key: string; unitId: string; conversionFactor: string; salePrice: string };
type BarcodeRow = { key: string; unitId: string; barcode: string };
type AttributeRow = { key: string; name: string; value: string };

/** "base" or the key of the pack row that is the default unit. */
type DefaultPick = string;

/**
 * The form is split into tabs so nothing needs scrolling; `fields` are the names whose server-side errors
 * mark the tab (and open it when the current tab has none). The images panel stays beside every tab.
 */
const TABS = [
  {
    key: "general",
    label: "General",
    fields: [
      "barcodes",
      "name",
      "nameLocal",
      "categoryId",
      "brandId",
      "code",
      "productType",
      "baseUnitId",
      "salePrice",
      "mrp",
      "isActive",
      "tags",
      "units",
    ],
  },
  {
    key: "stock",
    label: "Stock & tax",
    fields: ["trackingType", "hasExpiry", "shelfLifeDays", "reorderLevel", "reorderQuantity", "purchaseTaxGroupId", "saleTaxGroupId"],
  },
  { key: "regulatory", label: "Regulatory", fields: ["genericName", "registrationNo", "hsCode", "countryOfOrigin", "attributes"] },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const isTabKey = (value: string | undefined): value is TabKey => TABS.some((tab) => tab.key === value);

function tabHasErrors(key: TabKey, fieldErrors: Record<string, string> | undefined) {
  const tab = TABS.find((item) => item.key === key);
  return Boolean(fieldErrors && tab?.fields.some((field) => fieldErrors[field]));
}

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
const headCell = "px-2.5 py-2 text-left text-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400";
const bodyCell = "px-2.5 py-1.5 align-middle";
const subLabel = "mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-400";
const note = "text-xs text-gray-500 dark:text-gray-400";

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

/** At least one row, so the Barcode box always shows (an empty row isn't saved). */
function initialBarcodes(value: Product | undefined): BarcodeRow[] {
  if (!value || value.barcodes.length === 0) return [{ key: "barcode-0", unitId: "", barcode: "" }];
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

/**
 * The main picture is product.imageUrl (or the primary product_image row of an older record); every other
 * picture not tied to a size is a related one, so none is dropped on save.
 */
function initialImages(value: Product | undefined) {
  const images = value?.images ?? [];
  const main = value?.imageUrl ?? images.find((image) => image.isPrimary)?.url ?? null;
  const related = [...new Set(images.map((image) => image.url))].filter((url) => url !== main);
  return { main, related };
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
 * Fields of the add/edit product modal (rendered inside its <ActionForm>), in tabs beside the images
 * panel. Every tab stays mounted (hidden ones too), so all fields submit together. The pack, barcode,
 * attribute, image and tag rows are kept in state and submitted as JSON in hidden inputs that
 * saveProductAction parses.
 */
export function ProductForm({ value, options }: { value?: Product; options: ProductFormOptions }) {
  const { state } = useFormState();
  const [tab, setTab] = useState<TabKey>("general");
  const [productType, setProductType] = useState<ProductType>(value?.productType ?? "Stock");
  const [trackingType, setTrackingType] = useState<TrackingType>(value?.trackingType ?? "None");
  const [hasExpiry, setHasExpiry] = useState(value?.hasExpiry ?? false);
  const [baseUnitId, setBaseUnitId] = useState(value ? String(value.baseUnitId) : "");
  const [packs, setPacks] = useState<PackRow[]>(() => initialPacks(value));
  const [purchaseDefault, setPurchaseDefault] = useState<DefaultPick>(() => initialDefault(value, "isPurchaseDefault"));
  const [saleDefault, setSaleDefault] = useState<DefaultPick>(() => initialDefault(value, "isSaleDefault"));
  const [barcodes, setBarcodes] = useState<BarcodeRow[]>(() => initialBarcodes(value));
  const [attributes, setAttributes] = useState<AttributeRow[]>(() => initialAttributes(value));
  const [images] = useState(() => initialImages(value));
  const rootRef = useRef<HTMLDivElement>(null);

  // A save came back with field errors: if none is on the open tab, open the first tab that has one.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (!tabHasErrors(tab, state.fieldErrors)) {
      const withErrors = TABS.find((item) => tabHasErrors(item.key, state.fieldErrors));
      if (withErrors) setTab(withErrors.key);
    }
  }

  // The browser's own check (e.g. a required field) can't point at a field in a hidden tab: open that
  // tab first. The capture listener runs before the browser looks for the field to focus.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onInvalid = (event: Event) => {
      const key = (event.target as HTMLElement).closest<HTMLElement>("[data-tab]")?.dataset.tab;
      if (isTabKey(key)) flushSync(() => setTab(key));
    };
    root.addEventListener("invalid", onInvalid, true);
    return () => root.removeEventListener("invalid", onInvalid, true);
  }, []);

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

  /** A scanner ends with Enter: go on to the next barcode, or to Name after the last, instead of submitting the form. */
  function onBarcodeKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const inputs = rootRef.current?.querySelectorAll<HTMLInputElement>("input[data-barcode]");
    const next = inputs?.[index + 1] ?? document.getElementById("name");
    next?.focus();
  }

  /** Arrow keys move between tabs (the tab list is one stop for Tab). */
  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = TABS.findIndex((item) => item.key === tab);
    const next = TABS[(index + step + TABS.length) % TABS.length].key;
    setTab(next);
    document.getElementById(`product-tab-${next}`)?.focus();
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

  const panel = (key: TabKey) => ({
    role: "tabpanel" as const,
    id: `product-panel-${key}`,
    "aria-labelledby": `product-tab-${key}`,
    "data-tab": key,
    hidden: tab !== key,
  });

  return (
    <div ref={rootRef} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0">
        <div role="tablist" aria-label="Product details" className="no-scrollbar mb-3 flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-gray-800">
          {TABS.map((item) => {
            const selected = item.key === tab;
            const hasErrors = tabHasErrors(item.key, state.fieldErrors);
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                id={`product-tab-${item.key}`}
                aria-selected={selected}
                aria-controls={`product-panel-${item.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.key)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition",
                  selected
                    ? "border-brand-500 text-brand-600 dark:text-brand-300"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                {item.label}
                {hasErrors && (
                  <span className="size-1.5 rounded-full bg-red-500" title="Has errors">
                    <span className="sr-only">(has errors)</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="@container min-h-[21rem]">
          {/* ---- General */}
          <div {...panel("general")}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 @2xl:grid-cols-4">
              {/* Barcode first: scan it, then Enter goes on to Name. The unit beside it is the base unit or a pack. */}
              <Field label={barcodes.length > 1 ? "Barcodes" : "Barcode"} name="barcodes" className="col-span-2">
                <div className="space-y-2">
                  {barcodes.map((row, index) => (
                    <div key={row.key} className="flex items-center gap-2">
                      <Input
                        id={index === 0 ? "barcodes" : undefined}
                        data-barcode=""
                        value={row.barcode}
                        onChange={(event) =>
                          setBarcodes((rows) => rows.map((item) => (item.key === row.key ? { ...item, barcode: event.target.value } : item)))
                        }
                        onKeyDown={(event) => onBarcodeKeyDown(event, index)}
                        maxLength={64}
                        placeholder="Scan or type"
                        aria-label={index === 0 ? undefined : `Barcode ${index + 1}`}
                        className="min-w-0 flex-1 font-mono"
                      />
                      <div className="w-32 shrink-0">
                        <Select
                          value={row.unitId}
                          onChange={(event) =>
                            setBarcodes((rows) => rows.map((item) => (item.key === row.key ? { ...item, unitId: event.target.value } : item)))
                          }
                          aria-label={`Unit of barcode ${index + 1}`}
                          title="The unit this barcode is on: the base unit, or a pack such as the carton of 12."
                          className="h-9 px-2"
                        >
                          <option value="">{baseUnit ? `${baseUnit.code} (base)` : "Base unit"}</option>
                          {packedUnits.map((pack) => (
                            <option key={pack.key} value={pack.unitId}>
                              {packCode(pack.unitId)}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {/* Only a product saved with several barcodes shows more rows; each can be removed. */}
                      {barcodes.length > 1 && (
                        <RemoveButton onClick={() => setBarcodes((rows) => rows.filter((item) => item.key !== row.key))} label="Remove barcode" />
                      )}
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Name" name="name" required>
                <Input id="name" name="name" maxLength={250} defaultValue={value?.name} required />
              </Field>
              <Field label="Local name" name="nameLocal">
                <Input
                  id="nameLocal"
                  name="nameLocal"
                  maxLength={250}
                  defaultValue={value?.nameLocal ?? ""}
                  lang="bn"
                  placeholder="Bangla name"
                  title="Bangla name for receipts and search"
                />
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
              <Field label="Code" name="code">
                <Input
                  id="code"
                  name="code"
                  maxLength={50}
                  defaultValue={value?.code}
                  placeholder={value ? "Empty keeps the current code" : "Auto: P-00001, P-00002, …"}
                  title={value ? "Unique, e.g. FERT-UREA-50. Leave empty to keep the current code." : "Optional: leave empty to number it P-00001, P-00002, …"}
                />
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
              <Field
                label="Base unit"
                name="baseUnitId"
                required
                hint={value ? "Can't change once the product has stock movements." : undefined}
              >
                <Select
                  id="baseUnitId"
                  name="baseUnitId"
                  value={baseUnitId}
                  onChange={(event) => changeBaseUnit(event.target.value)}
                  required
                  title="The smallest unit you count, e.g. kg, pcs, feet."
                >
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
              <Field label={`Sale price per ${baseCode}`} name="salePrice">
                <Input id="salePrice" name="salePrice" inputMode="decimal" defaultValue={value ? String(value.salePrice) : ""} placeholder="0.00" />
              </Field>
              <Field label="MRP" name="mrp">
                <Input id="mrp" name="mrp" inputMode="decimal" defaultValue={value?.mrp ?? ""} placeholder="Printed price (optional)" />
              </Field>
              <div className="flex items-end pb-2">
                <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (can be bought and sold)" />
              </div>
              <Field label="Tags" name="tags" className="col-span-2 @2xl:col-span-4">
                <TagPicker id="tags" name="tags" options={options.tags} defaultValue={value?.tags ?? []} />
              </Field>
            </div>
            {/* Packs: units that hold several base units, with their own price and buy/sell default. */}
            <div className="mt-4">
              <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Packs</p>
                  <p className={note}>
                    Stock is kept in the base unit{baseUnit ? ` (${baseUnit.code})` : ""}. Add packs that hold several, e.g. 1 box = 12 pcs, 1 carton = 10
                    boxes.
                  </p>
                </div>
                <AddRowButton onClick={() => setPacks((rows) => [...rows, { key: newKey("pack"), unitId: "", conversionFactor: "", salePrice: "" }])}>
                  Add pack
                </AddRowButton>
              </div>
              <div className="custom-scrollbar overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full min-w-[29rem] text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02]">
                    <tr>
                      <th className={headCell}>Pack unit</th>
                      <th className={headCell}>{baseCode} in 1 pack</th>
                      <th className={headCell}>Pack price</th>
                      <th className={cn(headCell, "text-center")} title="The unit picked by default on purchases">
                        Buy<span className="sr-only"> default</span>
                      </th>
                      <th className={cn(headCell, "text-center")} title="The unit picked by default on sales">
                        Sell<span className="sr-only"> default</span>
                      </th>
                      <th className={headCell}>
                        <span className="sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr>
                      <td className={cn(bodyCell, "h-12 font-medium text-gray-800 dark:text-white/90")}>
                        {baseUnit ? baseUnit.code : "—"} <span className="text-xs font-normal text-gray-500">(base)</span>
                      </td>
                      <td className={cn(bodyCell, "text-gray-500 dark:text-gray-400")}>1</td>
                      <td className={cn(bodyCell, "text-xs text-gray-500 dark:text-gray-400")}>Sale price</td>
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
                          <td className={cn(bodyCell, "w-40")}>
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
                          <td className={cn(bodyCell, "w-28")}>
                            <Input
                              value={row.conversionFactor}
                              onChange={(event) => updatePack(row.key, { conversionFactor: event.target.value })}
                              inputMode="decimal"
                              placeholder="e.g. 50"
                              aria-label={`${baseCode} in one ${packCode(row.unitId)}`}
                              className={smallControl}
                            />
                          </td>
                          <td className={cn(bodyCell, "w-28")}>
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
                <p className={cn(note, "mt-2")}>
                  {packedUnits
                    .map((row) => {
                      const factor = Number(row.conversionFactor.replace(/,/g, ""));
                      return `1 ${packCode(row.unitId)} = ${Number.isFinite(factor) && factor > 0 ? formatQuantity(factor) : "?"} ${baseCode}`;
                    })
                    .join(" · ")}
                </p>
              )}
              <FieldError name="units" />
            </div>
          </div>

          {/* ---- Stock & tax */}
          <div {...panel("stock")}>
            {!isStock && <p className={cn(note, "mb-3")}>Only stock items are tracked by batch or serial number.</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 @2xl:grid-cols-4">
              <Field
                label="Tracking"
                name="trackingType"
                hint={value ? "Can't change once the product has stock movements." : "Batch for fertilizer, seed, pesticide; serial for machines."}
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
              <div className="flex flex-col gap-1 pt-1 @2xl:pt-8">
                <Checkbox
                  checked={effectiveExpiry}
                  disabled={effectiveTracking !== "Batch"}
                  onChange={(event) => setHasExpiry(event.target.checked)}
                  label="Has expiry date"
                />
                <FieldError name="hasExpiry" />
              </div>
              <Field label="Shelf life (days)" name="shelfLifeDays" hint="Optional, e.g. 730 for two years.">
                <Input id="shelfLifeDays" name="shelfLifeDays" inputMode="numeric" disabled={!effectiveExpiry} defaultValue={value?.shelfLifeDays ?? ""} />
              </Field>
              <div className="hidden @2xl:block" />
              <Field label={`Reorder level (${baseCode})`} name="reorderLevel" hint="Reorder Alert lists it at or below this.">
                <Input id="reorderLevel" name="reorderLevel" inputMode="decimal" defaultValue={value ? String(value.reorderLevel) : ""} placeholder="0" />
              </Field>
              <Field label={`Reorder quantity (${baseCode})`} name="reorderQuantity" hint="How much to buy each time.">
                <Input
                  id="reorderQuantity"
                  name="reorderQuantity"
                  inputMode="decimal"
                  defaultValue={value ? String(value.reorderQuantity) : ""}
                  placeholder="0"
                />
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
              <p className={cn(note, "mt-3")}>
                Last purchase cost:{" "}
                <span className="font-medium text-gray-700 tabular-nums dark:text-gray-300">{formatAmount(value.lastPurchaseCost)}</span> per{" "}
                {value.baseUnitCode} (set by purchases).
              </p>
            )}
          </div>

          {/* ---- Regulatory */}
          <div {...panel("regulatory")}>
            <p className={cn(note, "mb-3")}>For fertilizer, pesticide, seed and imported goods.</p>
            <div className="grid gap-x-6 gap-y-4 @3xl:grid-cols-2">
              <div className="grid grid-cols-2 content-start gap-x-4 gap-y-3">
                <Field label="Generic name" name="genericName" hint="e.g. Urea, Imidacloprid 20% SL." className="col-span-2">
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

              <div className="min-w-0">
                <p className={subLabel}>Attributes</p>
                {attributes.length > 0 && (
                  <div className="space-y-2">
                    {attributes.map((row, index) => (
                      <div key={row.key} className="flex items-center gap-2">
                        <div className="w-36 shrink-0">
                          <Input
                            value={row.name}
                            onChange={(event) =>
                              setAttributes((rows) => rows.map((item) => (item.key === row.key ? { ...item, name: event.target.value } : item)))
                            }
                            list={ATTRIBUTE_LIST_ID}
                            maxLength={100}
                            placeholder="Name, e.g. npk"
                            aria-label={`Attribute ${index + 1} name`}
                            className={smallControl}
                          />
                        </div>
                        <Input
                          value={row.value}
                          onChange={(event) =>
                            setAttributes((rows) => rows.map((item) => (item.key === row.key ? { ...item, value: event.target.value } : item)))
                          }
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
                <p className={cn(note, "mt-1.5")}>Free details, e.g. npk = 46-0-0 for fertilizer, toxicity class for pesticide, size for hardware.</p>
                <FieldError name="attributes" />
                <div className="mt-3">
                  <AddRowButton onClick={() => setAttributes((rows) => [...rows, { key: newKey("attribute"), name: "", value: "" }])}>
                    Add attribute
                  </AddRowButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Beside every tab on wide screens; it fills the column's height and its related images scroll. */}
      <div className="relative min-h-0">
        <ProductImages
          defaultMain={images.main}
          defaultRelated={images.related}
          alt={value?.name ?? "Product image"}
          className="lg:absolute lg:inset-0"
        />
      </div>

      <input type="hidden" name="units" value={packsJson} />
      <input type="hidden" name="barcodes" value={barcodesJson} />
      <input type="hidden" name="attributes" value={attributesJson} />
      <input type="hidden" name="trackingType" value={effectiveTracking} />
      <input type="hidden" name="hasExpiry" value={effectiveExpiry ? "on" : ""} />
    </div>
  );
}
