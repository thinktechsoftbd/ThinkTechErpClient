"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/core/auth/session";
import { getMyOrganizations, rememberOrganization } from "./organization";

/** Switches the organization the user works in, then reloads the current section from its start. */
export async function switchOrganizationAction(formData: FormData) {
  await requireSession();
  const organizationId = Number(formData.get("organizationId"));
  const organizations = await getMyOrganizations();
  if (!organizations.ok || !organizations.data.some((o) => o.organizationId === organizationId)) return;

  await rememberOrganization(organizationId);

  // Ids in the current URL belong to the previous organization: go back to the section's start.
  const returnTo = String(formData.get("returnTo") ?? "/dashboard");
  const section = returnTo.match(/^\/(inventory|purchase)(\/[a-z-]+)?/)?.[0];
  redirect(section ?? (returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard"));
}
