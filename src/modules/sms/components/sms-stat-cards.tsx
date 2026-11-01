import { ArrowLeftRight, Banknote, Building2, PackageOpen, Send, ShoppingCart, type LucideIcon } from "lucide-react";
import { StatCard } from "@/core/ui/feedback";
import { formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { LOCAL_CURRENCY, type SmsOverview } from "../types";

type SmsStatKey = "purchased" | "allocated" | "unallocated" | "used" | "organizationAvailable" | "spend";

function card(overview: SmsOverview, key: SmsStatKey): { label: string; value: string; icon: LucideIcon; hint: string } {
  switch (key) {
    case "purchased":
      return {
        label: "SMS bought",
        value: formatNumber(overview.purchasedSms),
        icon: ShoppingCart,
        hint: `From ${formatNumber(overview.providerCount)} provider(s), ${formatNumber(overview.activeProviderCount)} active`,
      };
    case "allocated":
      return { label: "Allocated", value: formatNumber(overview.allocatedSms), icon: ArrowLeftRight, hint: "Given to organizations" };
    case "unallocated":
      return {
        label: "Left to allocate",
        value: formatNumber(overview.unallocatedSms),
        icon: PackageOpen,
        hint: "Bought from providers, not yet allocated",
      };
    case "used":
      return { label: "Used", value: formatNumber(overview.usedSms), icon: Send, hint: "Sent by organizations" };
    case "organizationAvailable":
      return {
        label: "Left with organizations",
        value: formatNumber(overview.organizationAvailableSms),
        icon: Building2,
        hint: "Allocated and not yet used",
      };
    case "spend":
      return {
        label: "Spend",
        value: `${formatAmount(overview.purchaseSpend)} ${LOCAL_CURRENCY}`,
        icon: Banknote,
        hint: `All purchases, in ${LOCAL_CURRENCY}`,
      };
  }
}

/** The SMS totals of the overview, as stat cards in the order given. */
export function SmsStatCards({ overview, show }: { overview: SmsOverview; show: readonly SmsStatKey[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {show.map((key) => (
        <StatCard key={key} {...card(overview, key)} />
      ))}
    </div>
  );
}
