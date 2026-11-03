import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { MappedLedgerHead } from "@/modules/accounting/components/pickers";
import {
  deleteBrandAction,
  deleteCategoryAction,
  deleteProductAction,
  deleteUnitAction,
  deleteWarehouseAction,
  loadProductAction,
  saveBrandAction,
  saveCategoryAction,
  saveProductAction,
  saveUnitAction,
  saveWarehouseAction,
} from "../../actions/setup";
import { label, type Brand, type Category, type Product, type Unit, type Warehouse } from "../../types";
import { BrandFields, CategoryFields, UnitFields, WAREHOUSE_TYPE_LABELS, WarehouseFields } from "./fields";
import { ProductEditButton } from "./product-edit-button";
import type { ProductFormOptions } from "./product-form";

const muted = "text-gray-500 dark:text-gray-400";
const strong = "font-medium text-gray-800 dark:text-white/90";

function LocalName({ value }: { value: string | null }) {
  return value ? (
    <span lang="bn" className={`block text-xs ${muted}`}>
      {value}
    </span>
  ) : null;
}

/** Product count linking to the product list filtered by it. */
function ProductCount({ count, href, title }: { count: number; href?: string; title: string }) {
  if (!href || count === 0) return <span className={count === 0 ? muted : undefined}>{formatNumber(count)}</span>;
  return (
    <Link href={href} className="font-medium text-brand-500 hover:underline" title={title}>
      {formatNumber(count)}
    </Link>
  );
}

const inUseMessage = (what: string) => `${what} in use by products or stock documents can't be deleted. Deactivate it instead to hide it.`;
const usedByMessage = (count: number) => `${formatNumber(count)} product(s) use it, so it can't be deleted. Deactivate it instead to hide it.`;

// ---- Units

export function UnitsTable({ rows, canManage }: { rows: Unit[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Code</TH>
          <TH>Name</TH>
          <TH>Type</TH>
          <TH>Fractions</TH>
          <TH>ISO</TH>
          <TH className="text-right">Products</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className={`font-mono ${strong}`}>{row.code}</TD>
            <TD>
              {row.name}
              <LocalName value={row.nameLocal} />
            </TD>
            <TD>{row.unitType}</TD>
            <TD>{row.allowDecimal ? "Yes" : <span className={muted}>No</span>}</TD>
            <TD className={muted}>{row.isoCode ?? "—"}</TD>
            <TD className="text-right tabular-nums">
              <ProductCount count={row.productCount} title={`Products counted in ${row.code}`} />
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton mode="edit" label="Edit" title="Edit unit" action={saveUnitAction.bind(null, row.id)} submitLabel="Save changes">
                    <UnitFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteUnitAction.bind(null, row.id)}
                    itemLabel={`unit "${row.code}"`}
                    message={row.productCount > 0 ? usedByMessage(row.productCount) : inUseMessage("A unit")}
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

// ---- Categories

/** "Fertilizer > Urea" with the parent levels muted. */
function CategoryPath({ path }: { path: string }) {
  const parts = path.split(" > ");
  const name = parts.pop();
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`} className={`inline-flex items-center gap-1 ${muted}`}>
          {part}
          <ChevronRight className="size-3.5" aria-hidden />
        </span>
      ))}
      <span className={strong}>{name}</span>
    </span>
  );
}

export function CategoriesTable({
  rows,
  categories,
  canManage,
}: {
  rows: Category[];
  /** Every category, for the edit modal's parent picker. */
  categories: Pick<Category, "id" | "path" | "isActive">[];
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Category</TH>
          <TH>Code</TH>
          <TH>Ledger head</TH>
          <TH className="text-right">Sort</TH>
          <TH className="text-right">Products</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <CategoryPath path={row.path || row.name} />
              <LocalName value={row.nameLocal} />
            </TD>
            <TD className={`font-mono ${muted}`}>{row.code ?? "—"}</TD>
            <TD>
              <MappedLedgerHead row={row} />
            </TD>
            <TD className={`text-right tabular-nums ${muted}`}>{row.sortOrder}</TD>
            <TD className="text-right tabular-nums">
              <ProductCount count={row.productCount} href={`/inventory/products?category=${row.id}`} title={`Show the products in ${row.name}`} />
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(row.updatedAt ?? row.createdAt)}</TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit category"
                    action={saveCategoryAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <CategoryFields value={row} categories={categories} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteCategoryAction.bind(null, row.id)}
                    itemLabel={`category "${row.path || row.name}"`}
                    message="A category with products or sub-categories can't be deleted. Deactivate it instead to hide it."
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

// ---- Brands

export function BrandsTable({ rows, canManage }: { rows: Brand[]; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Brand</TH>
          <TH className="text-right">Products</TH>
          <TH>Status</TH>
          <TH>Updated</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <span className={strong}>{row.name}</span>
              <LocalName value={row.nameLocal} />
            </TD>
            <TD className="text-right tabular-nums">
              <ProductCount count={row.productCount} href={`/inventory/products?brand=${row.id}`} title={`Show the ${row.name} products`} />
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(row.updatedAt ?? row.createdAt)}</TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton mode="edit" label="Edit" title="Edit brand" action={saveBrandAction.bind(null, row.id)} submitLabel="Save changes">
                    <BrandFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteBrandAction.bind(null, row.id)}
                    itemLabel={`brand "${row.name}"`}
                    message={row.productCount > 0 ? usedByMessage(row.productCount) : undefined}
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

// ---- Warehouses

export function WarehousesTable({ rows, currency, canManage }: { rows: Warehouse[]; currency: string | null; canManage: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Code</TH>
          <TH>Name</TH>
          <TH>Type</TH>
          <TH>Contact</TH>
          <TH className="text-right">Stock value{currency ? ` (${currency})` : ""}</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className={`font-mono ${strong}`}>{row.code}</TD>
            <TD>
              <span className="inline-flex flex-wrap items-center gap-2">
                <span className={strong}>{row.name}</span>
                {row.isDefault && <Badge tone="brand">Default</Badge>}
              </span>
              <LocalName value={row.nameLocal} />
            </TD>
            <TD className="whitespace-nowrap">{WAREHOUSE_TYPE_LABELS[row.warehouseType] ?? row.warehouseType}</TD>
            <TD className={`max-w-64 ${muted}`}>
              {row.phone && <span className="block whitespace-nowrap">{row.phone}</span>}
              {row.address && <span className="block truncate" title={row.address}>{row.address}</span>}
              {!row.phone && !row.address && "—"}
            </TD>
            <TD className="text-right tabular-nums">{formatAmount(row.stockValue)}</TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  <FormModalButton
                    mode="edit"
                    label="Edit"
                    title="Edit warehouse"
                    action={saveWarehouseAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <WarehouseFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    action={deleteWarehouseAction.bind(null, row.id)}
                    itemLabel={`warehouse "${row.name}"`}
                    message={
                      row.stockValue !== 0
                        ? `It still holds stock worth ${formatAmount(row.stockValue)}, so it can't be deleted. Deactivate it instead to hide it.`
                        : inUseMessage("A warehouse")
                    }
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

// ---- Products

function TrackingCell({ product }: { product: Product }) {
  if (product.productType !== "Stock") return <Badge>{label(product.productType)}</Badge>;
  if (product.trackingType === "None") return <span className={muted}>—</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone="brand">{product.trackingType}</Badge>
      {product.hasExpiry && <Badge tone="warning">Expiry</Badge>}
    </span>
  );
}

export function ProductsTable({
  rows,
  formOptions,
  canManage,
}: {
  rows: Product[];
  /** For the edit modal (one shared object for every row); null hides Edit (options didn't load). */
  formOptions: ProductFormOptions | null;
  canManage: boolean;
}) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Code</TH>
          <TH>Name</TH>
          <TH>Category</TH>
          <TH>Unit</TH>
          <TH>Tracking</TH>
          <TH className="text-right">Stock</TH>
          <TH className="text-right">Last cost</TH>
          <TH className="text-right">Sale price</TH>
          <TH>Status</TH>
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD className={`font-mono whitespace-nowrap ${strong}`}>{row.code}</TD>
            <TD className="min-w-48">
              <span className={strong}>{row.name}</span>
              <LocalName value={row.nameLocal} />
              {row.brandName && <span className={`block text-xs ${muted}`}>{row.brandName}</span>}
            </TD>
            <TD className={row.categoryName ? undefined : muted}>{row.categoryName ?? "—"}</TD>
            <TD className="font-mono">{row.baseUnitCode}</TD>
            <TD>
              <TrackingCell product={row} />
            </TD>
            <TD className="text-right whitespace-nowrap tabular-nums">
              {row.productType === "Stock" ? (
                <span className={row.reorderLevel > 0 && row.stockQuantity <= row.reorderLevel ? "font-medium text-amber-600 dark:text-amber-400" : undefined}>
                  {formatQuantity(row.stockQuantity)} <span className={`text-xs ${muted}`}>{row.baseUnitCode}</span>
                </span>
              ) : (
                <span className={muted}>—</span>
              )}
            </TD>
            <TD className="text-right tabular-nums">{row.lastPurchaseCost > 0 ? formatAmount(row.lastPurchaseCost) : <span className={muted}>—</span>}</TD>
            <TD className="text-right whitespace-nowrap tabular-nums">
              {formatAmount(row.salePrice)}
              {row.mrp !== null && <span className={`block text-xs ${muted}`}>MRP {formatAmount(row.mrp)}</span>}
            </TD>
            <TD>
              <StatusBadge active={row.isActive} />
            </TD>
            {canManage && (
              <TD className="text-right">
                <span className="inline-flex items-center gap-1">
                  {formOptions && (
                    <ProductEditButton
                      productLabel={`${row.code} · ${row.name}`}
                      load={loadProductAction.bind(null, row.id)}
                      action={saveProductAction.bind(null, row.id)}
                      options={formOptions}
                    />
                  )}
                  <ConfirmDeleteButton
                    action={deleteProductAction.bind(null, row.id)}
                    itemLabel={`product "${row.name}"`}
                    message={
                      row.stockQuantity !== 0
                        ? `It still has ${formatQuantity(row.stockQuantity)} ${row.baseUnitCode} in stock, so it can't be deleted. Deactivate it instead to hide it.`
                        : inUseMessage("A product")
                    }
                  />
                </span>
              </TD>
            )}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
