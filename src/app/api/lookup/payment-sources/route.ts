import type { NextRequest } from "next/server";
import { queryId, routeJson } from "@/core/api/route-json";
import { inventoryApi } from "@/modules/inventory/api";

/**
 * Payment source search for the invoice picker (?search=&offset=), or one source by ?id=.
 * Each source carries its lines (the "source type" options).
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return routeJson(async () => {
    const id = queryId(params, "id");
    if (id) return [await inventoryApi.paymentSources.get(id)];
    const offset = Number(params.get("offset"));
    const page = await inventoryApi.paymentSources.search({
      search: params.get("search")?.trim().slice(0, 100) || undefined,
      limit: 20,
      offset: Number.isSafeInteger(offset) && offset > 0 ? offset : 0,
    });
    return page.items;
  });
}
