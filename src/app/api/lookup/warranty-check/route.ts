import type { NextRequest } from "next/server";
import { routeJson } from "@/core/api/route-json";
import { warrantyApi } from "@/modules/warranty/api";

/** The warranty check for the job form: cards (and units, jobs) for a serial, warranty no., invoice no. or mobile (?q=). */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100);
  if (!q) return Response.json({ error: "Enter a serial no., warranty no., invoice no. or mobile number." }, { status: 400 });
  return routeJson(() => warrantyApi.cards.check(q));
}
