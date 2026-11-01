import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, CRUD_PAGE_SIZE, FilterSelect, ListToolbar, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { canManageInventory } from "@/modules/inventory/access";
import { saveProductAction } from "@/modules/inventory/actions/setup";
import { inventoryApi } from "@/modules/inventory/api";
import { ProductForm, type ProductFormOptions } from "@/modules/inventory/components/setup/product-form";
import { ProductsTable } from "@/modules/inventory/components/setup/tables";
import { getInventoryOptions } from "@/modules/inventory/queries";
import {
  INVENTORY_MANAGE_PERMISSION,
  PRODUCT_TYPES,
  label,
  type InventoryOptions,
  type ProductType,
  type TaxGroupOption,
} from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Products" };

const basePath = "/inventory/products";
type Props = PageProps<"/inventory/products">;

const TYPE_OPTIONS = PRODUCT_TYPES.map((type) => ({ value: type, label: type === "Stock" ? "Stock item" : label(type) }));

function idFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

function typeFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw && (PRODUCT_TYPES as readonly string[]).includes(raw) ? (raw as ProductType) : undefined;
}

function taxGroupLabel(group: TaxGroupOption) {
  const rates = group.rates.map((rate) => `${rate.taxCode} ${rate.ratePercent}%`).join(" + ");
  return `${group.name}${rates ? ` (${rates})` : ""}${group.isActive ? "" : " (inactive)"}`;
}

/** The slim option lists the product form needs. */
function toFormOptions(options: InventoryOptions): ProductFormOptions {
  return {
    units: options.units.map(({ id, code, name, nameLocal, isActive }) => ({ id, code, name, nameLocal, isActive })),
    categories: options.categories.map(({ id, path, isActive }) => ({ id, path, isActive })),
    brands: options.brands.map(({ id, name, isActive }) => ({ id, name, isActive })),
    taxGroups: options.taxGroups.map((group) => ({ id: group.id, label: taxGroupLabel(group), isActive: group.isActive })),
  };
}

export default function ProductsPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Products"
        description="Items you buy, stock and sell, with their packs, barcodes, prices and tracking."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Products" }]}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <NewProductButton />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={9} />}>
          <ProductList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewProductButton() {
  const options = await getInventoryOptions();
  if (!options.ok) return null;
  return (
    <FormModalButton mode="create" label="New product" title="New product" action={saveProductAction.bind(null, null)} submitLabel="Create" size="lg">
      <ProductForm options={toFormOptions(options.data)} />
    </FormModalButton>
  );
}

async function ProductList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const categoryId = idFilter(query.category);
  const brandId = idFilter(query.brand);
  const productType = typeFilter(query.type);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);

  const [session, options, result] = await Promise.all([
    requireSession(),
    getInventoryOptions(),
    tryApi(() => inventoryApi.products.list({ search, isActive, categoryId, brandId, productType, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || categoryId !== undefined || brandId !== undefined || productType !== undefined || isActive !== undefined;
  // One shared object, so the edit modals of all rows reuse it.
  const formOptions = options.ok ? toFormOptions(options.data) : null;
  const noUnits = options.ok && options.data.units.length === 0;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} product(s)` : "Products"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Code, name, barcode" filtered={filtered}>
            <FilterSelect
              name="category"
              label="Category"
              value={categoryId ? String(categoryId) : undefined}
              options={(options.ok ? options.data.categories : []).map((category) => ({ value: String(category.id), label: category.path }))}
              allLabel="All categories"
              className="w-48"
            />
            <FilterSelect
              name="brand"
              label="Brand"
              value={brandId ? String(brandId) : undefined}
              options={(options.ok ? options.data.brands : []).map((brand) => ({ value: String(brand.id), label: brand.name }))}
              allLabel="All brands"
              className="w-40"
            />
            <FilterSelect name="type" label="Type" value={productType} options={TYPE_OPTIONS} allLabel="All types" className="w-36" />
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" className="w-36" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Package}
          title={filtered ? "No products match these filters" : "No products yet"}
          description={
            filtered ? undefined : noUnits ? (
              <>
                Add your{" "}
                <Link href="/inventory/units" className="text-brand-500 hover:underline">
                  units
                </Link>{" "}
                first (kg, pcs, bag), then products with New product.
              </>
            ) : (
              "Add products with New product."
            )
          }
        />
      ) : (
        <>
          <ProductsTable rows={result.data.items} formOptions={formOptions} canManage={canManageInventory(session)} />
          <Pagination
            basePath={basePath}
            query={{
              q: search,
              category: categoryId,
              brand: brandId,
              type: productType,
              active: isActive === undefined ? undefined : String(isActive),
            }}
            offset={offset}
            limit={CRUD_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
