import "server-only";
import { connection } from "next/server";
import { apiFetch } from "@/core/api/client";
import { serverEnv } from "@/core/config/server-env";
import type { DashboardOverview, DashboardPeriod } from "./types";

/** Today as YYYY-MM-DD in APP_TIME_ZONE (or the server's zone): the API's own clock is UTC. */
function todayInAppZone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: serverEnv.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** The dashboard of the organization chosen in the header, for a period. */
export async function getDashboardOverview(period: DashboardPeriod) {
  // Today must be read at request time, not while the page is prerendered.
  await connection();
  return apiFetch<DashboardOverview>("/api/dashboard/overview", { query: { period, today: todayInAppZone() } });
}
