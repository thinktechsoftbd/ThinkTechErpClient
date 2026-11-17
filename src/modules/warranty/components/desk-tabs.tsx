import { LinkTabs } from "@/core/ui/tabs";

export type DeskTab = "jobs" | "check" | "cards" | "claims";

/** The service desk's sections: one screen for warranty and paid service. */
export function DeskTabs({ active }: { active: DeskTab }) {
  return (
    <LinkTabs
      active={active}
      tabs={[
        { key: "jobs", label: "Service jobs", href: "/warranty/service" },
        { key: "check", label: "Warranty check", href: "/warranty/service/check" },
        { key: "cards", label: "Warranty cards", href: "/warranty/service/cards" },
        { key: "claims", label: "Supplier claims", href: "/warranty/service/claims" },
      ]}
    />
  );
}
