import {
  Briefcase,
  Building2,
  ChartColumn,
  CircleHelp,
  FileText,
  Inbox,
  Layers,
  Mail,
  Newspaper,
  Quote,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type WebsiteTableDefinition = {
  /** Table name in the API's `website` schema (route segment of /api/website/{table}). */
  table: string;
  label: string;
  singular: string;
  description: string;
  icon: LucideIcon;
  /** Columns to prefer in list views when present on the records. */
  listColumns: readonly string[];
  /** Submissions from the public site — managed but not normally authored here. */
  inbound?: boolean;
};

// Keep in sync with WebsiteRepository.SupportedTables in the API.
export const websiteTables: readonly WebsiteTableDefinition[] = [
  {
    table: "posts",
    label: "Posts",
    singular: "Post",
    description: "Blog posts and news articles.",
    icon: Newspaper,
    listColumns: ["title", "slug", "status", "is_published", "published_at", "created_at"],
  },
  {
    table: "services",
    label: "Services",
    singular: "Service",
    description: "Service offerings shown on the website.",
    icon: Layers,
    listColumns: ["title", "name", "slug", "is_active", "sort_order", "display_order"],
  },
  {
    table: "case_studies",
    label: "Case studies",
    singular: "Case study",
    description: "Customer success stories.",
    icon: FileText,
    listColumns: ["title", "client_name", "client", "industry", "slug", "is_published"],
  },
  {
    table: "industries",
    label: "Industries",
    singular: "Industry",
    description: "Industries served.",
    icon: Building2,
    listColumns: ["name", "title", "slug", "is_active", "sort_order"],
  },
  {
    table: "testimonials",
    label: "Testimonials",
    singular: "Testimonial",
    description: "Client quotes and reviews.",
    icon: Quote,
    listColumns: ["name", "author_name", "company", "rating", "quote", "is_active"],
  },
  {
    table: "faqs",
    label: "FAQs",
    singular: "FAQ",
    description: "Frequently asked questions.",
    icon: CircleHelp,
    listColumns: ["question", "category", "sort_order", "is_active"],
  },
  {
    table: "stats",
    label: "Stats",
    singular: "Stat",
    description: "Headline numbers and counters.",
    icon: ChartColumn,
    listColumns: ["label", "value", "suffix", "sort_order"],
  },
  {
    table: "job_openings",
    label: "Job openings",
    singular: "Job opening",
    description: "Open positions on the careers page.",
    icon: Briefcase,
    listColumns: ["title", "department", "location", "employment_type", "is_active"],
  },
  {
    table: "job_applications",
    label: "Job applications",
    singular: "Job application",
    description: "Applications submitted from the careers page.",
    icon: UserRound,
    listColumns: ["full_name", "name", "email", "phone", "job_opening_id", "status", "created_at"],
    inbound: true,
  },
  {
    table: "inquiries",
    label: "Inquiries",
    singular: "Inquiry",
    description: "Contact form submissions.",
    icon: Inbox,
    listColumns: ["name", "full_name", "email", "subject", "status", "created_at"],
    inbound: true,
  },
  {
    table: "newsletter_subscribers",
    label: "Newsletter",
    singular: "Subscriber",
    description: "Newsletter subscribers.",
    icon: Mail,
    listColumns: ["email", "name", "is_active", "subscribed_at", "created_at"],
    inbound: true,
  },
];

export function getWebsiteTable(table: string) {
  return websiteTables.find((definition) => definition.table === table);
}
