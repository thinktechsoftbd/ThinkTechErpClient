import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { apiFetch, tryApi } from "@/core/api/client";
import { serverEnv } from "@/core/config/server-env";
import type { UserOrganization } from "@/modules/security/types";
import { ORGANIZATION_COOKIE } from "./constants";

export type { UserOrganization };

/** The user's organizations, loaded once per request; empty in dev sign-in mode. */
export const getMyOrganizations = cache(async () => {
  if (serverEnv.authMode === "dev") return { ok: true as const, data: [] as UserOrganization[] };
  return tryApi(() => apiFetch<UserOrganization[]>("/api/security/my-organizations"));
});

/** The organization chosen in the switcher (cookie), when it is still one of the user's. */
export async function getCurrentOrganization(): Promise<UserOrganization | undefined> {
  const result = await getMyOrganizations();
  if (!result.ok || result.data.length === 0) return undefined;
  const selected = Number((await cookies()).get(ORGANIZATION_COOKIE)?.value);
  return (
    result.data.find((organization) => organization.organizationId === selected) ??
    result.data.find((organization) => organization.isDefault) ??
    result.data[0]
  );
}
