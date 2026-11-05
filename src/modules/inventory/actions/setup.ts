"use server";

import { refresh } from "next/cache";
import { requireModuleAccess } from "@/core/auth/guards";
import { formString, positiveInteger, toActionError } from "@/core/forms/action-errors";
import { actionError, actionSuccess, type ActionState } from "@/core/forms/action-state";
import { parseDecimal } from "@/core/utils/number";
import { inventoryApi } from "../api";
import type { ProductLoadResult } from "../components/setup/product-edit-button";
import { inventoryModule } from "../module";
import {
  PRODUCT_TYPES,
  TRACKING_TYPES,
  UNIT_TYPES,
  WAREHOUSE_TYPES,
  type BrandUpsertRequest,
  type CategoryUpsertRequest,
  type InventorySettingUpdateRequest,
  type ProductType,
  type ProductUpsertRequest,
  type TrackingType,
  type UnitUpsertRequest,
  type WarehouseUpsertRequest,
} from "../types";

// Server Actions for the inventory setup screens (units, categories, brands, warehouses,
// products, settings). The API re-checks INVENTORY.M; its refusals come back as form state.

type FieldErrors = Record<string, string>;

const MAX_AMOUNT = 999_999_999_999;

// ---- Form readers

function invalid(fieldErrors: FieldErrors) {
  return actionError("Please correct the highlighted fields.", fieldErrors);
}

function hasErrors(fieldErrors: FieldErrors) {
  return Object.keys(fieldErrors).length > 0;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function requiredText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (!value) fieldErrors[name] = "Required.";
  else if (value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value;
}

function optionalText(formData: FormData, name: string, max: number, fieldErrors: FieldErrors) {
  const value = formString(formData, name);
  if (value.length > max) fieldErrors[name] = `Max ${max} characters.`;
  return value || null;
}

/** A whole number in [min, max]; empty gives `fallback` (null = optional). */
function readWhole<T extends number | null>(
  formData: FormData,
  name: string,
  range: { min: number; max: number },
  fallback: T,
  fieldErrors: FieldErrors,
): number | T {
  const raw = formString(formData, name).replace(/,/g, "");
  if (!raw) return fallback;
  if (!/^-?\d+$/.test(raw)) {
    fieldErrors[name] = "Enter a whole number.";
    return fallback;
  }
  const value = Number(raw);
  if (value < range.min || value > range.max) fieldErrors[name] = `Enter ${range.min} to ${range.max}.`;
  return value;
}

/** A decimal of 0 or more; empty gives `fallback` (null = optional). */
function readAmount<T extends number | null>(formData: FormData, name: string, fallback: T, fieldErrors: FieldErrors): number | T {
  const raw = formString(formData, name);
  if (!raw) return fallback;
  const value = parseDecimal(raw);
  if (value === null) {
    fieldErrors[name] = "Enter a number.";
    return fallback;
  }
  if (value < 0) fieldErrors[name] = "Can't be negative.";
  else if (value > MAX_AMOUNT) fieldErrors[name] = "Too large.";
  return value;
}

/** An optional picker value (an id); empty gives null. */
function optionalId(formData: FormData, name: string, fieldErrors: FieldErrors) {
  if (!formString(formData, name)) return null;
  const id = positiveInteger(formData, name);
  if (id === null) fieldErrors[name] = "Choose a valid option.";
  return id;
}

function oneOf<T extends string>(values: readonly T[], value: string): value is T {
  return (values as readonly string[]).includes(value);
}

/** Re-checks access, runs the API call, refreshes the page; API errors become form state. */
async function mutate(call: () => Promise<unknown>, successMessage: string): Promise<ActionState> {
  try {
    await requireModuleAccess(inventoryModule);
    await call();
  } catch (error) {
    return toActionError(error);
  }
  refresh();
  return actionSuccess(successMessage);
}

// ---- Units

/** Creates (id = null) or updates a unit. */
export async function saveUnitAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const unitType = formString(formData, "unitType");
  if (!oneOf(UNIT_TYPES, unitType)) fieldErrors.unitType = "Choose a unit type.";
  const body: UnitUpsertRequest = {
    code: requiredText(formData, "code", 20, fieldErrors),
    name: requiredText(formData, "name", 100, fieldErrors),
    nameLocal: optionalText(formData, "nameLocal", 100, fieldErrors),
    unitType,
    isoCode: optionalText(formData, "isoCode", 10, fieldErrors),
    allowDecimal: checked(formData, "allowDecimal"),
    isActive: checked(formData, "isActive"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  return mutate(
    () => (id === null ? inventoryApi.units.create(body) : inventoryApi.units.update(id, body)),
    id === null ? "Unit created." : "Unit saved.",
  );
}

export async function deleteUnitAction(id: number): Promise<ActionState> {
  return mutate(() => inventoryApi.units.remove(id), "Unit deleted.");
}

// ---- Categories

/** Creates (id = null) or updates a category. */
export async function saveCategoryAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const parentCategoryId = optionalId(formData, "parentCategoryId", fieldErrors);
  if (id !== null && parentCategoryId === id) fieldErrors.parentCategoryId = "A category can't be its own parent.";
  const body: CategoryUpsertRequest = {
    parentCategoryId,
    code: optionalText(formData, "code", 30, fieldErrors),
    name: requiredText(formData, "name", 150, fieldErrors),
    nameLocal: optionalText(formData, "nameLocal", 150, fieldErrors),
    sortOrder: readWhole(formData, "sortOrder", { min: -1_000_000, max: 1_000_000 }, 0, fieldErrors),
    isActive: checked(formData, "isActive"),
    accSubClassId: optionalId(formData, "accSubClassId", fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  return mutate(
    () => (id === null ? inventoryApi.categories.create(body) : inventoryApi.categories.update(id, body)),
    id === null ? "Category created." : "Category saved.",
  );
}

export async function deleteCategoryAction(id: number): Promise<ActionState> {
  return mutate(() => inventoryApi.categories.remove(id), "Category deleted.");
}

/**
 * Sets the ledger head of categories (e.g. the ones an invoice couldn't be finalized without), keeping the rest of
 * each category as it is.
 */
export async function mapCategoryLedgerHeadsAction(items: { categoryId: number; accSubClassId: number }[]): Promise<ActionState> {
  const valid = items.filter(
    (item) => Number.isSafeInteger(item.categoryId) && item.categoryId > 0 && Number.isSafeInteger(item.accSubClassId) && item.accSubClassId > 0,
  );
  if (valid.length === 0) return actionError("Choose a ledger head for each category.");

  return mutate(async () => {
    for (const item of valid) {
      const category = await inventoryApi.categories.get(item.categoryId);
      await inventoryApi.categories.update(item.categoryId, {
        parentCategoryId: category.parentCategoryId,
        code: category.code,
        name: category.name,
        nameLocal: category.nameLocal,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        accSubClassId: item.accSubClassId,
      });
    }
  }, valid.length === 1 ? "Category mapped." : `${valid.length} categories mapped.`);
}

// ---- Brands

/** Creates (id = null) or updates a brand. */
export async function saveBrandAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const body: BrandUpsertRequest = {
    name: requiredText(formData, "name", 150, fieldErrors),
    nameLocal: optionalText(formData, "nameLocal", 150, fieldErrors),
    isActive: checked(formData, "isActive"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  return mutate(
    () => (id === null ? inventoryApi.brands.create(body) : inventoryApi.brands.update(id, body)),
    id === null ? "Brand created." : "Brand saved.",
  );
}

export async function deleteBrandAction(id: number): Promise<ActionState> {
  return mutate(() => inventoryApi.brands.remove(id), "Brand deleted.");
}

// ---- Warehouses

/** Creates (id = null) or updates a warehouse (a shop/outlet or a godown). */
export async function saveWarehouseAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const warehouseType = formString(formData, "warehouseType");
  if (!oneOf(WAREHOUSE_TYPES, warehouseType)) fieldErrors.warehouseType = "Choose Store or Warehouse.";
  const body: WarehouseUpsertRequest = {
    code: requiredText(formData, "code", 30, fieldErrors),
    name: requiredText(formData, "name", 150, fieldErrors),
    nameLocal: optionalText(formData, "nameLocal", 150, fieldErrors),
    warehouseType,
    address: optionalText(formData, "address", 500, fieldErrors),
    phone: optionalText(formData, "phone", 30, fieldErrors),
    isActive: checked(formData, "isActive"),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  return mutate(
    () => (id === null ? inventoryApi.warehouses.create(body) : inventoryApi.warehouses.update(id, body)),
    id === null ? "Warehouse created." : "Warehouse saved.",
  );
}

export async function deleteWarehouseAction(id: number): Promise<ActionState> {
  return mutate(() => inventoryApi.warehouses.remove(id), "Warehouse deleted.");
}

// ---- Products

/** Rows the product form serializes as JSON in hidden inputs (values as typed). */
type PackDraft = { unitId?: unknown; conversionFactor?: unknown; salePrice?: unknown; isPurchaseDefault?: unknown; isSaleDefault?: unknown };
type BarcodeDraft = { unitId?: unknown; barcode?: unknown };
type AttributeDraft = { name?: unknown; value?: unknown };

function readRows<T>(formData: FormData, name: string): T[] | null {
  const raw = formData.get(name);
  if (typeof raw !== "string" || !raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value.filter((row) => row && typeof row === "object") as T[]) : null;
  } catch {
    return null;
  }
}

const cell = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

function readPacks(rows: PackDraft[], baseUnitId: number, fieldErrors: FieldErrors) {
  const units: ProductUpsertRequest["units"] = [];
  for (const row of rows) {
    const unitText = cell(row.unitId);
    const factorText = cell(row.conversionFactor);
    const priceText = cell(row.salePrice);
    if (!unitText && !factorText && !priceText) continue; // an empty row

    const unitId = Number(unitText);
    if (!Number.isSafeInteger(unitId) || unitId <= 0) {
      fieldErrors.units = "Choose the unit of every pack, or remove the empty row.";
      break;
    }
    if (unitId === baseUnitId) {
      fieldErrors.units = "The base unit is always included; list only the other packs.";
      break;
    }
    if (units.some((unit) => unit.unitId === unitId)) {
      fieldErrors.units = "A pack unit is listed twice.";
      break;
    }
    const conversionFactor = parseDecimal(factorText);
    if (conversionFactor === null || conversionFactor <= 0 || conversionFactor > MAX_AMOUNT) {
      fieldErrors.units = "Enter how many base units make one pack (more than 0).";
      break;
    }
    const salePrice = priceText ? parseDecimal(priceText) : null;
    if (priceText && (salePrice === null || salePrice < 0 || salePrice > MAX_AMOUNT)) {
      fieldErrors.units = "A pack price must be a number of 0 or more.";
      break;
    }
    units.push({
      unitId,
      conversionFactor,
      salePrice,
      isPurchaseDefault: row.isPurchaseDefault === true,
      isSaleDefault: row.isSaleDefault === true,
    });
  }
  return units;
}

function readBarcodes(rows: BarcodeDraft[], baseUnitId: number, packs: ProductUpsertRequest["units"], fieldErrors: FieldErrors) {
  const barcodes: ProductUpsertRequest["barcodes"] = [];
  for (const row of rows) {
    const barcode = cell(row.barcode);
    if (!barcode) continue;
    if (barcode.length > 64) {
      fieldErrors.barcodes = "A barcode can be at most 64 characters.";
      break;
    }
    if (barcodes.some((item) => item.barcode === barcode)) {
      fieldErrors.barcodes = `Barcode ${barcode} is listed twice.`;
      break;
    }
    const unitText = cell(row.unitId);
    const unitId = unitText ? Number(unitText) : null;
    if (unitId !== null && unitId !== baseUnitId && !packs.some((pack) => pack.unitId === unitId)) {
      fieldErrors.barcodes = "A barcode's unit must be the base unit or one of the packs.";
      break;
    }
    barcodes.push({ unitId, barcode });
  }
  return barcodes;
}

function readAttributes(rows: AttributeDraft[], fieldErrors: FieldErrors) {
  const attributes: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of rows) {
    const name = cell(row.name);
    const value = cell(row.value);
    if (!name && !value) continue;
    if (!name) {
      fieldErrors.attributes = `Give "${value}" a name, or remove the row.`;
      break;
    }
    if (!value) {
      fieldErrors.attributes = `Enter a value for "${name}", or remove the row.`;
      break;
    }
    if (seen.has(name.toLowerCase())) {
      fieldErrors.attributes = `"${name}" is listed twice.`;
      break;
    }
    seen.add(name.toLowerCase());
    attributes[name] = value;
  }
  return attributes;
}

/** Creates (id = null) or updates a product with its packs, barcodes and attributes. */
export async function saveProductAction(id: number | null, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};

  const productType = formString(formData, "productType");
  if (!oneOf(PRODUCT_TYPES, productType)) fieldErrors.productType = "Choose a type.";
  const trackingType = formString(formData, "trackingType") || "None";
  if (!oneOf(TRACKING_TYPES, trackingType)) fieldErrors.trackingType = "Choose how stock is tracked.";
  else if (productType !== "Stock" && trackingType !== "None") fieldErrors.trackingType = "Only stock items can be tracked.";
  const hasExpiry = checked(formData, "hasExpiry");
  if (hasExpiry && trackingType !== "Batch") fieldErrors.hasExpiry = "Expiry dates need batch tracking.";

  const baseUnitId = positiveInteger(formData, "baseUnitId");
  if (baseUnitId === null) fieldErrors.baseUnitId = "Choose the base unit.";

  const countryOfOrigin = optionalText(formData, "countryOfOrigin", 2, fieldErrors)?.toUpperCase() ?? null;
  if (countryOfOrigin && !/^[A-Z]{2}$/.test(countryOfOrigin)) fieldErrors.countryOfOrigin = "Use the 2-letter code, e.g. BD.";

  const packRows = readRows<PackDraft>(formData, "units");
  const barcodeRows = readRows<BarcodeDraft>(formData, "barcodes");
  const attributeRows = readRows<AttributeDraft>(formData, "attributes");
  if (!packRows || !barcodeRows || !attributeRows) return actionError("The form couldn't be read. Close it and try again.");
  const units = readPacks(packRows, baseUnitId ?? 0, fieldErrors);
  const barcodes = readBarcodes(barcodeRows, baseUnitId ?? 0, units, fieldErrors);
  const attributes = readAttributes(attributeRows, fieldErrors);

  const body: ProductUpsertRequest = {
    code: optionalText(formData, "code", 50, fieldErrors),
    name: requiredText(formData, "name", 250, fieldErrors),
    nameLocal: optionalText(formData, "nameLocal", 250, fieldErrors),
    productType: productType as ProductType,
    categoryId: optionalId(formData, "categoryId", fieldErrors),
    brandId: optionalId(formData, "brandId", fieldErrors),
    baseUnitId: baseUnitId ?? 0,
    trackingType: trackingType as TrackingType,
    hasExpiry,
    shelfLifeDays: hasExpiry ? readWhole(formData, "shelfLifeDays", { min: 1, max: 36500 }, null, fieldErrors) : null,
    genericName: optionalText(formData, "genericName", 250, fieldErrors),
    registrationNo: optionalText(formData, "registrationNo", 100, fieldErrors),
    hsCode: optionalText(formData, "hsCode", 20, fieldErrors),
    countryOfOrigin,
    purchaseTaxGroupId: optionalId(formData, "purchaseTaxGroupId", fieldErrors),
    saleTaxGroupId: optionalId(formData, "saleTaxGroupId", fieldErrors),
    salePrice: readAmount(formData, "salePrice", 0, fieldErrors),
    mrp: readAmount(formData, "mrp", null, fieldErrors),
    reorderLevel: readAmount(formData, "reorderLevel", 0, fieldErrors),
    reorderQuantity: readAmount(formData, "reorderQuantity", 0, fieldErrors),
    attributes,
    imageUrl: optionalText(formData, "imageUrl", 500, fieldErrors),
    isActive: checked(formData, "isActive"),
    units,
    barcodes,
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  return mutate(
    () => (id === null ? inventoryApi.products.create(body) : inventoryApi.products.update(id, body)),
    id === null ? "Product created." : "Product saved.",
  );
}

export async function deleteProductAction(id: number): Promise<ActionState> {
  return mutate(() => inventoryApi.products.remove(id), "Product deleted.");
}

/**
 * Loads one product with its packs and barcodes for the edit modal (list rows don't carry them).
 */
export async function loadProductAction(id: number): Promise<ProductLoadResult> {
  try {
    await requireModuleAccess(inventoryModule);
    return { status: "success", product: await inventoryApi.products.get(id) };
  } catch (error) {
    return { status: "error", message: toActionError(error).message ?? "The product couldn't be loaded." };
  }
}

// ---- Settings

/** Saves the organization's inventory settings (the first save marks them configured). */
export async function saveInventorySettingsAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const fieldErrors: FieldErrors = {};
  const baseCurrencyLookupDataId = positiveInteger(formData, "baseCurrencyLookupDataId");
  if (baseCurrencyLookupDataId === null) fieldErrors.baseCurrencyLookupDataId = "Choose the base currency.";
  const body: InventorySettingUpdateRequest = {
    baseCurrencyLookupDataId: baseCurrencyLookupDataId ?? 0,
    fiscalYearStartMonth: readWhole(formData, "fiscalYearStartMonth", { min: 1, max: 12 }, 7, fieldErrors),
    pricesIncludeTax: checked(formData, "pricesIncludeTax"),
    allowNegativeStock: checked(formData, "allowNegativeStock"),
    requireApproval: checked(formData, "requireApproval"),
    expiryAlertDays: readWhole(formData, "expiryAlertDays", { min: 0, max: 3650 }, 30, fieldErrors),
    defaultWarehouseId: optionalId(formData, "defaultWarehouseId", fieldErrors),
  };
  if (hasErrors(fieldErrors)) return invalid(fieldErrors);

  return mutate(() => inventoryApi.saveSettings(body), "Inventory settings saved.");
}
