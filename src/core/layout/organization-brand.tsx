import { getCurrentOrganization } from "@/core/org/organization";
import { BrandMark, SidebarBrand, type BrandOrganization } from "./app-sidebar";

// The organization the user works in, as the sidebar's top and the header's mark. Both read the session:
// render inside <Suspense> (with SidebarBrand / BrandMark as the fallback, the app's own mark).

async function currentBrand(): Promise<BrandOrganization | null> {
  const current = await getCurrentOrganization();
  return current ? { name: current.name, logoUrl: current.logoUrl } : null;
}

export async function OrganizationSidebarBrand() {
  return <SidebarBrand organization={await currentBrand()} />;
}

export async function OrganizationHeaderMark() {
  return <BrandMark organization={await currentBrand()} className="xl:hidden" />;
}
