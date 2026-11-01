import type { NextRequest } from "next/server";
import { queryId, routeJson } from "@/core/api/route-json";
import { accountingApi } from "@/modules/accounting/api";

/** A supplier's or customer's balance on a ledger head (?accountId=&partyId=), debit minus credit. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const accountId = queryId(params, "accountId");
  const partyId = queryId(params, "partyId");
  if (!accountId || !partyId) return Response.json({ error: "Choose the ledger head and the party." }, { status: 400 });
  return routeJson(() => accountingApi.reports.partyBalance({ accountId, partyId }));
}
