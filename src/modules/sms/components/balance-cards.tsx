import { ArrowLeftRight, Database, Send, ShoppingCart, Wallet } from "lucide-react";
import { StatCard } from "@/core/ui/feedback";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import type { SmsPlatformBalance } from "../types";

export function BalanceCards({ balance }: { balance: SmsPlatformBalance }) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total purchased" value={formatNumber(balance.totalPurchasedSms)} icon={ShoppingCart} />
        <StatCard label="Total available" value={formatNumber(balance.totalAvailableSms)} icon={Wallet} />
        <StatCard label="Unallocated" value={formatNumber(balance.unallocatedSms)} icon={Database} hint="Held by the platform" />
        <StatCard
          label="Assigned to clients"
          value={formatNumber(balance.assignedAvailableSms)}
          icon={ArrowLeftRight}
          hint="Allocated, not yet sent"
        />
        <StatCard label="Consumed" value={formatNumber(balance.consumedSms)} icon={Send} />
      </div>
      <p className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
        Updated {formatDateTime(balance.updatedAt)}
      </p>
    </div>
  );
}
