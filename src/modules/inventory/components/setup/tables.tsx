import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { SortHeader, type SortDirection } from "@/core/crud/sort-header";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { formatAmount, formatQuantity } from "@/core/utils/number";
import { MappedLedgerHead, ledgerHeadLabel, mappedLedgerHead } from "@/modules/accounting/components/pickers";
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
import { CategoryEditButton } from "./category-edit-button";
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

export function UnitsTable({
  rows,
  canManage,
  sorting,
}: {
  rows: Unit[];
  canManage: boolean;
  /** Headers that sort the list on the server (code, name, type, decimals, products, status). */
  sorting?: { sort: string; direction: SortDirection; basePath: string; query: Record<string, string | undefined> };
}) {
  const header = (label: string, column: string, className?: string) =>
    sorting ? (
      <SortHeader label={label} column={column} className={className} {...sorting} />
    ) : (
      <TH className={className}>{label}</TH>
    );
  return (
    <Table>
      <THead>
        <tr>
          {header("Code", "code")}
          {header("Name", "name")}
          {header("Type", "type")}
          {header("Fractions", "decimals")}
          <TH>ISO</TH>
          {header("Products", "products", "text-right")}
          {header("Status", "status")}
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
                  <FormModalButton
                    mode="edit"
                    iconOnly
                    label={`Edit ${row.code}`}
                    title="Edit unit"
                    action={saveUnitAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <UnitFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    iconOnly
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
  sorting,
}: {
  rows: Category[];
  /** Every category, for the edit modal's parent picker. */
  categories: Pick<Category, "id" | "path" | "isActive">[];
  canManage: boolean;
  /** Headers that sort the list on the server (category, code, sort, products, status, updated). */
  sorting?: { sort: string; direction: SortDirection; basePath: string; query: Record<string, string | undefined> };
}) {
  const header = (label: string, column: string, className?: string) =>
    sorting ? (
      <SortHeader label={label} column={column} className={className} {...sorting} />
    ) : (
      <TH className={className}>{label}</TH>
    );
  return (
    <Table>
      <THead>
        <tr>
          {header("Category", "category")}
          {header("Code", "code")}
          <TH>Ledger head</TH>
          {header("Sort", "sort", "text-right")}
          {header("Products", "products", "text-right")}
          {header("Status", "status")}
          {header("Updated", "updated")}
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
                    iconOnly
                    label={`Edit ${row.path || row.name}`}
                    title="Edit category"
                    action={saveCategoryAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <CategoryFields value={row} categories={categories} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    iconOnly
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

export function BrandsTable({
  rows,
  canManage,
  sorting,
}: {
  rows: Brand[];
  canManage: boolean;
  /** Headers that sort the list on the server (brand, products, status, updated). */
  sorting?: { sort: string; direction: SortDirection; basePath: string; query: Record<string, string | undefined> };
}) {
  const header = (label: string, column: string, className?: string) =>
    sorting ? (
      <SortHeader label={label} column={column} className={className} {...sorting} />
    ) : (
      <TH className={className}>{label}</TH>
    );
  return (
    <Table>
      <THead>
        <tr>
          {header("Brand", "brand")}
          {header("Products", "products", "text-right")}
          {header("Status", "status")}
          {header("Updated", "updated")}
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
                  <FormModalButton
                    mode="edit"
                    iconOnly
                    label={`Edit ${row.name}`}
                    title="Edit brand"
                    action={saveBrandAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <BrandFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    iconOnly
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

export function WarehousesTable({
  rows,
  currency,
  canManage,
  sorting,
}: {
  rows: Warehouse[];
  currency: string | null;
  canManage: boolean;
  /** Headers that sort the list on the server (code, name, type, stock, status). */
  sorting?: { sort: string; direction: SortDirection; basePath: string; query: Record<string, string | undefined> };
}) {
  const header = (label: string, column: string, className?: string) =>
    sorting ? (
      <SortHeader label={label} column={column} className={className} {...sorting} />
    ) : (
      <TH className={className}>{label}</TH>
    );
  return (
    <Table>
      <THead>
        <tr>
          {header("Code", "code")}
          {header("Name", "name")}
          {header("Type", "type")}
          <TH>Contact</TH>
          {header(`Stock value${currency ? ` (${currency})` : ""}`, "stock", "text-right")}
          {header("Status", "status")}
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
                    iconOnly
                    label={`Edit ${row.name}`}
                    title="Edit warehouse"
                    action={saveWarehouseAction.bind(null, row.id)}
                    submitLabel="Save changes"
                  >
                    <WarehouseFields value={row} />
                  </FormModalButton>
                  <ConfirmDeleteButton
                    iconOnly
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

/** A product row's category ledger head: its name (code, name and classes on hover), or a warning when none is mapped. */
function CategoryLedger({ category }: { category: Category }) {
  const head = mappedLedgerHead(category);
  if (!head) return <span className="block text-xs text-amber-600 dark:text-amber-400">No ledger head</span>;
  return (
    <span className={`block max-w-48 truncate text-xs ${muted}`} title={ledgerHeadLabel(head)}>
      {head.name || head.code}
    </span>
  );
}

export function ProductsTable({
  rows,
  categories,
  formOptions,
  canManage,
  sorting,
}: {
  rows: Product[];
  /** Every category (one shared array, from the options call): the rows' ledger heads and the edit-category modal. */
  categories: Category[];
  /** For the edit modal (one shared object for every row); null hides Edit (options didn't load). */
  formOptions: ProductFormOptions | null;
  canManage: boolean;
  /** Headers that sort the list on the server (code, name, category, unit, tracking, stock, cost, price, status). */
  sorting?: { sort: string; direction: SortDirection; basePath: string; query: Record<string, string | undefined> };
}) {
  const header = (label: string, column: string, className?: string) =>
    sorting ? (
      <SortHeader label={label} column={column} className={className} {...sorting} />
    ) : (
      <TH className={className}>{label}</TH>
    );
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  return (
    <Table>
      <THead>
        <tr>
          {header("Code", "code")}
          {header("Name", "name")}
          {header("Category", "category")}
          {header("Unit", "unit")}
          {header("Tracking", "tracking")}
          {header("Stock", "stock", "text-right")}
          {header("Last cost", "cost", "text-right")}
          {header("Sale price", "price", "text-right")}
          {header("Status", "status")}
          {canManage && <TH className="text-right">Actions</TH>}
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const category = row.categoryId === null ? undefined : categoryById.get(row.categoryId);
          return (
            <TR key={row.id}>
              <TD className={`font-mono whitespace-nowrap ${strong}`}>{row.code}</TD>
              <TD className="min-w-48">
                <span className={strong}>{row.name}</span>
                <LocalName value={row.nameLocal} />
                {row.brandName && <span className={`block text-xs ${muted}`}>{row.brandName}</span>}
              </TD>
              <TD className="min-w-36">
                {row.categoryName ? (
                  <span className="flex items-start gap-1">
                    <span className="min-w-0">
                      <span className="block" title={category?.path}>
                        {row.categoryName}
                      </span>
                      {category && <CategoryLedger category={category} />}
                    </span>
                    {canManage && category && <CategoryEditButton category={category} categories={categories} />}
                  </span>
                ) : (
                  <span className={muted}>—</span>
                )}
              </TD>
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
                      iconOnly
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
          );
        })}
      </TBody>
    </Table>
  );
}
