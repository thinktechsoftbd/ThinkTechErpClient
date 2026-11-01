import type { NextRequest } from "next/server";
import { queryId, routeJson } from "@/core/api/route-json";
import { inventoryApi } from "@/modules/inventory/api";

/** Batches of a product with stock in a warehouse, first to expire first (?productId=&warehouseId=). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const productId = queryId(params, "productId");
  const warehouseId = queryId(params, "warehouseId");
  if (!productId || !warehouseId) return Response.json([]);
  return routeJson(() => inventoryApi.getBatchStock(productId, warehouseId));
}
