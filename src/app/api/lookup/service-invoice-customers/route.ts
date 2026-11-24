import type { NextRequest } from "next/server";
import { routeJson } from "@/core/api/route-json";
import { serviceInvoiceApi } from "@/modules/warranty/service-invoice-api";

/**
 * Customer search for the service invoice screen (works with SERVICE_INVOICE.V alone): code, name or mobile
 * (?search=; empty lists the first ones), or exact ids (?ids=1,2). Suppliers are listed too, as on the sales screen.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return routeJson(() =>
    serviceInvoiceApi.customers({
      search: params.get("search")?.slice(0, 100) || undefined,
      ids: params.get("ids")?.slice(0, 500) || undefined,
      limit: 20,
    }),
  );
}
