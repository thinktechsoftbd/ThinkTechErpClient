import type { NextRequest } from "next/server";
import { queryId, routeJson } from "@/core/api/route-json";
import { purchaseApi } from "@/modules/purchase/api";

/** A supplier's posted invoices with something left to pay, oldest due first (?supplierId=). */
export async function GET(request: NextRequest) {
  const supplierId = queryId(request.nextUrl.searchParams, "supplierId");
  if (!supplierId) return Response.json([]);
  return routeJson(() => purchaseApi.suppliers.openInvoices(supplierId));
}
