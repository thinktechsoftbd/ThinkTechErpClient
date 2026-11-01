import { Building2 } from "lucide-react";
import { getCurrentOrganization, getMyOrganizations } from "@/core/org/organization";
import { OrganizationSelect } from "./organization-select";

/**
 * The organization the user works in (Inventory, Purchase), with a picker when there is more than
 * one. Reads the session: render inside <Suspense>.
 */
export async function OrganizationSwitcher() {
  const [organizations, current] = await Promise.all([getMyOrganizations(), getCurrentOrganization()]);
  if (!organizations.ok || !current) return null;

  if (organizations.data.length === 1) {
    return (
      <span className="hidden items-center gap-2 text-sm font-medium text-gray-600 sm:inline-flex dark:text-gray-300">
        <Building2 className="size-4" aria-hidden />
        {current.name}
      </span>
    );
  }

  return (
    <OrganizationSelect
      currentId={current.organizationId}
      options={organizations.data.map((o) => ({ id: o.organizationId, name: o.name }))}
    />
  );
}
