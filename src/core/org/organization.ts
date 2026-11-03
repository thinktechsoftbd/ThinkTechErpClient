import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { apiFetch, tryApi } from "@/core/api/client";
import { serverEnv } from "@/core/config/server-env";
import type { UserOrganization } from "@/modules/security/types";
import { ORGANIZATION_COOKIE } from "./constants";

export type { UserOrganization };

/**
 * The internal organizations the user works in, loaded once per request; empty in dev sign-in mode.
 * External ones (customers) are left out: they aren't offered in the header's switcher and are never
 * the organization the ERP works in.
 */
export const getMyOrganizations = cache(async () => {
  if (serverEnv.authMode === "dev") return { ok: true as const, data: [] as UserOrganization[] };
  // Not organization-scoped: asking it must not depend on the current organization (which comes from it).
  const result = await tryApi(() => apiFetch<UserOrganization[]>("/api/security/my-organizations", { organizationHeader: false }));
  return result.ok ? { ...result, data: result.data.filter((organization) => !organization.isExternal) } : result;
});

/**
 * The organization chosen in the switcher (cookie) when it is still one of the user's internal ones;
 * otherwise their default, or the first. Every API call works in this one (see apiFetch).
 */
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

/**
 * Makes this the organization the user works in, as the header's switcher does. Server Actions only;
 * check first that it is one of the user's organizations.
 */
export async function rememberOrganization(organizationId: number) {
  (await cookies()).set(ORGANIZATION_COOKIE, String(organizationId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
