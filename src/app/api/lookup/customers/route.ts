import type { NextRequest } from "next/server";
import { routeJson } from "@/core/api/route-json";
import { salesApi } from "@/modules/sales/api";

/** Customer search for the sales screen: code, name or mobile (?search=), or exact ids (?ids=1,2). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return routeJson(() =>
    salesApi.customers.options({
      search: params.get("search")?.slice(0, 100) || undefined,
      ids: params.get("ids")?.slice(0, 500) || undefined,
      limit: 20,
    }),
  );
}
