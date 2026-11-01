import type { NextRequest } from "next/server";
import { queryId, routeJson } from "@/core/api/route-json";
import { salesApi } from "@/modules/sales/api";

/** A customer's posted invoices with something left to collect, oldest due first (?customerId=). */
export async function GET(request: NextRequest) {
  const customerId = queryId(request.nextUrl.searchParams, "customerId");
  if (!customerId) return Response.json([]);
  return routeJson(() => salesApi.customers.openInvoices(customerId));
}
