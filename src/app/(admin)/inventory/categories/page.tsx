import type { Metadata } from "next";
import { FolderTree } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import type { SortDirection } from "@/core/crud/sort-header";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { canManageInventory } from "@/modules/inventory/access";
import { saveCategoryAction } from "@/modules/inventory/actions/setup";
import { inventoryApi } from "@/modules/inventory/api";
import { CategoryFields } from "@/modules/inventory/components/setup/fields";
import { CategoriesTable } from "@/modules/inventory/components/setup/tables";
import { getInventoryOptions } from "@/modules/inventory/queries";
import { INVENTORY_MANAGE_PERMISSION } from "@/modules/inventory/types";

export const metadata: Metadata = { title: "Categories" };

const basePath = "/inventory/categories";
const PAGE_SIZE = 30;
const SORTS = ["category", "code", "sort", "products", "status", "updated"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/inventory/categories">;

function parentFilter(value: string | string[] | undefined) {
  const raw = firstParam(value);
  return raw ? (parseIdParam(raw) ?? undefined) : undefined;
}

/** Every category as the pickers need it (from the cached options call). */
async function getCategoryChoices() {
  const options = await getInventoryOptions();
  return options.ok ? options.data.categories.map(({ id, path, isActive }) => ({ id, path, isActive })) : [];
}

export default function CategoriesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Categories"
        compact
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, { label: "Categories" }]}
        actions={
          <Suspense>
            <PermissionOnly code={INVENTORY_MANAGE_PERMISSION}>
              <NewCategoryButton searchParams={searchParams} />
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={8} />}>
          <CategoryList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function NewCategoryButton({ searchParams }: Pick<Props, "searchParams">) {
  const [categories, query] = await Promise.all([getCategoryChoices(), searchParams]);
  return (
    <FormModalButton
      mode="create"
      label="New category"
      title="New category"
      action={saveCategoryAction.bind(null, null)}
      submitLabel="Create"
    >
      <CategoryFields categories={categories} defaultParentId={parentFilter(query.parent)} />
    </FormModalButton>
  );
}

// Server-side: the API filters (name, code or local name; parent; status), sorts and pages; 30 per page.
async function CategoryList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const parentId = parentFilter(query.parent);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);

  const [session, categories, result] = await Promise.all([
    requireSession(),
    getCategoryChoices(),
    tryApi(() => inventoryApi.categories.list({ search, isActive, parentId, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || parentId !== undefined || isActive !== undefined;
  const parent = parentId ? String(parentId) : undefined;
  const active = isActive === undefined ? undefined : String(isActive);

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} categor${result.data.totalCount === 1 ? "y" : "ies"}` : "Categories"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Name, code or local name"
          filters={[
            {
              name: "parent",
              label: "Parent",
              value: parent,
              options: categories.map((category) => ({ value: String(category.id), label: `Under ${category.path}` })),
              allLabel: "All levels",
              className: "w-52",
            },
            { name: "active", label: "Status", value: activeParam, options: ACTIVE_FILTER_OPTIONS, allLabel: "All statuses" },
          ]}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={FolderTree}
          title={filtered ? "No categories match these filters" : "No categories yet"}
          description={filtered ? undefined : "Add a top-level group such as Fertilizer, then its sub-groups, with New category."}
        />
      ) : (
        <>
          <CategoriesTable
            rows={result.data.items}
            categories={categories}
            canManage={canManageInventory(session)}
            sorting={{ sort: sort ?? "", direction, basePath, query: { q: search, parent, active } }}
          />
          <Pagination
            basePath={basePath}
            query={{ q: search, parent, active, sort, dir: direction === "asc" ? undefined : direction }}
            offset={offset}
            limit={PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
