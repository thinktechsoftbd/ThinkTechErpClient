import type { NextRequest } from "next/server";
import { routeJson } from "@/core/api/route-json";
import { accountingApi } from "@/modules/accounting/api";

/** Ledger head search for the voucher, bill and report pickers: 20 at a time (?search=&offset=). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const offset = Number(params.get("offset"));
  return routeJson(() =>
    accountingApi.ledgerHeadSearch({
      search: params.get("search")?.trim().slice(0, 100) || undefined,
      limit: 20,
      offset: Number.isSafeInteger(offset) && offset > 0 ? offset : 0,
    }),
  );
}
