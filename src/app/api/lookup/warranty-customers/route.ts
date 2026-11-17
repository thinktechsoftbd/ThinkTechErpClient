import type { NextRequest } from "next/server";
import { routeJson } from "@/core/api/route-json";
import { warrantyApi } from "@/modules/warranty/api";

/**
 * Customer search for the warranty screens (works with WARRANTY.V alone): code, name or mobile (?search=; empty lists
 * the first ones), or exact ids (?ids=1,2). Suppliers are listed too, as on the sales screen.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return routeJson(() =>
    warrantyApi.lookups.customers({
      search: params.get("search")?.slice(0, 100) || undefined,
      ids: params.get("ids")?.slice(0, 500) || undefined,
      limit: 20,
    }),
  );
}
