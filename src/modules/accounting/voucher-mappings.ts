import "server-only";
import { tryApi } from "@/core/api/client";
import { inventoryApi } from "@/modules/inventory/api";

/** A category an invoice's bill voucher can't be made without: it has no ledger head yet. */
export type UnmappedCategory = { id: number; name: string; path: string };

/**
 * The categories of these products that have no ledger head, for the Map popup shown when finalizing an
 * invoice failed. Products or categories that can't be read are left out.
 */
export async function loadUnmappedCategories(productIds: number[]): Promise<UnmappedCategory[]> {
  const products = await Promise.all([...new Set(productIds)].map((id) => tryApi(() => inventoryApi.products.get(id))));
  const categoryIds = [...new Set(products.flatMap((product) => (product.ok && product.data.categoryId ? [product.data.categoryId] : [])))];
  const categories = await Promise.all(categoryIds.map((id) => tryApi(() => inventoryApi.categories.get(id))));
  return categories.flatMap((category) =>
    category.ok && category.data.accSubClassId === null ? [{ id: category.data.id, name: category.data.name, path: category.data.path }] : [],
  );
}
