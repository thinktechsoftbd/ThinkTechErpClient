import type { NextRequest } from "next/server";
import { queryId, routeJson } from "@/core/api/route-json";
import { inventoryApi } from "@/modules/inventory/api";

/** Product search for document lines: code, name or barcode (?search=&stockOnly=&warehouseId=). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return routeJson(() =>
    inventoryApi.searchProducts({
      search: params.get("search")?.slice(0, 100) || undefined,
      stockOnly: params.get("stockOnly") === "true",
      warehouseId: queryId(params, "warehouseId"),
      limit: 20,
    }),
  );
}
