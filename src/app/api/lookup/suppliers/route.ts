import type { NextRequest } from "next/server";
import { queryId, routeJson } from "@/core/api/route-json";
import { purchaseApi } from "@/modules/purchase/api";
import type { SupplierOption } from "@/modules/purchase/types";

/** Supplier search for the purchase screens: code, name or mobile, 20 at a time (?search=), or one supplier by ?id=. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return routeJson(async (): Promise<SupplierOption[]> => {
    const id = queryId(params, "id");
    if (id) {
      const supplier = await purchaseApi.suppliers.get(id);
      return [
        {
          id: supplier.id,
          code: supplier.code,
          name: supplier.name,
          mobile: supplier.mobile,
          address: supplier.addressLine1 ?? supplier.city,
          paymentTermsDays: supplier.paymentTermsDays,
          currencyLookupDataId: supplier.currencyLookupDataId,
          balance: supplier.balance,
          isActive: supplier.isActive,
        },
      ];
    }
    return purchaseApi.suppliers.options(params.get("search")?.trim().slice(0, 100) || undefined, 20);
  });
}
