import "server-only";
import { tryApi } from "@/core/api/client";
import { inventoryApi } from "@/modules/inventory/api";
import { purchaseApi } from "@/modules/purchase/api";
import { salesApi } from "@/modules/sales/api";

/**
 * Something an invoice's bill voucher can't be made without, because it has no ledger head yet: an item
 * category, or the invoice's supplier or customer.
 */
export type UnmappedHead = { kind: "category" | "supplier" | "customer"; id: number; name: string; detail: string | null };

/**
 * What still has no ledger head, for the Map popup shown when finalizing an invoice failed: the products'
 * categories, and the party when the invoice leaves something unpaid. Anything that can't be read is left out.
 */
export async function loadUnmappedHeads(
  productIds: number[],
  party: { kind: "supplier" | "customer"; id: number } | null,
): Promise<UnmappedHead[]> {
  const [products, partyResult] = await Promise.all([
    Promise.all([...new Set(productIds)].map((id) => tryApi(() => inventoryApi.products.get(id)))),
    party
      ? tryApi<{ id: number; name: string; code: string; accSubClassId: number | null }>(() =>
          party.kind === "supplier" ? purchaseApi.suppliers.get(party.id) : salesApi.customers.get(party.id),
        )
      : null,
  ]);
  const categoryIds = [...new Set(products.flatMap((product) => (product.ok && product.data.categoryId ? [product.data.categoryId] : [])))];
  const categories = await Promise.all(categoryIds.map((id) => tryApi(() => inventoryApi.categories.get(id))));

  const heads: UnmappedHead[] = categories.flatMap((category) =>
    category.ok && category.data.accSubClassId === null
      ? [{ kind: "category" as const, id: category.data.id, name: category.data.name, detail: category.data.path }]
      : [],
  );
  if (party && partyResult?.ok && partyResult.data.accSubClassId === null) {
    heads.push({ kind: party.kind, id: partyResult.data.id, name: partyResult.data.name, detail: partyResult.data.code });
  }
  return heads;
}
