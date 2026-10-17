import { Globe } from "lucide-react";
import { defineModule } from "@/core/modules/types";
import { websiteTables } from "./tables";

export const websiteModule = defineModule({
  key: "website",
  name: "WebSite",
  description: "Public website content: posts, services, case studies, FAQs and inbound submissions.",
  icon: Globe,
  basePath: "/website",
  status: "active",
  // The API currently only requires an authenticated user for /api/website.
  nav: [
    { label: "Overview", href: "/website", exact: true },
    ...websiteTables.map((table) => ({ label: table.label, href: `/website/${table.table}` })),
  ],
  permissions: [
    { key: "website.content.view", label: "View website content" },
    { key: "website.content.manage", label: "Create and edit website content" },
    { key: "website.submissions.view", label: "View inquiries and applications" },
  ],
});
