import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  Clock3,
  Hourglass,
  LineChart,
  Package,
  PieChart,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/core/ui/card";
import { cn } from "@/core/utils/cn";
import { addDays, compactTaka, daysBetween, formatTaka, monthName, percentChange, shortDate } from "../format";
import { DASHBOARD_PERIODS, type DashboardOverview } from "../types";
import { CATEGORY_COLORS, OTHER_COLOR, SERIES, STATUS_COLORS, TONES, type Tone } from "../colors";
import { DonutChart, GroupedBarChart, Legend, Sparkline, TrendChart, type BarGroup, type BarSeries, type TrendPoint } from "./charts";

type Overview = DashboardOverview;

/** The short name of what the figures compare with: "last month", "month before", "last year". */
function compareWording(overview: Overview) {
  return overview.period === "this-year" ? "last year" : overview.period === "last-month" ? "month before" : "last month";
}

function previousWording(overview: Overview) {
  return DASHBOARD_PERIODS.find((p) => p.value === overview.period)?.previous ?? "the previous period";
}

/** A card with a coloured icon chip and title; `actions` sit on the right of the title. */
export function Panel({
  icon: Icon,
  tone,
  title,
  actions,
  className,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col p-5 shadow-theme-xs", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-800 dark:text-white/90">
          <span className={cn("flex size-8 items-center justify-center rounded-lg", TONES[tone].chip)}>
            <Icon className="size-4.5" aria-hidden />
          </span>
          {title}
        </h2>
        {actions}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </Card>
  );
}

/** What a panel shows when it has nothing to draw: its icon in its colour, and why. */
function EmptyNote({ icon: Icon, tone, children }: { icon: LucideIcon; tone: Tone; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 px-4 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <span className={cn("flex size-11 items-center justify-center rounded-full", TONES[tone].chip)}>
        <Icon className="size-5" aria-hidden />
      </span>
      {children}
    </div>
  );
}

/**
 * A stat tile on a tinted card: label, value, the change against the previous stretch (green when it went the
 * good way, red when the bad way, grey when neither), and an optional sparkline in the corner.
 */
function KpiCard({
  icon: Icon,
  tone,
  label,
  value,
  current,
  previous,
  upIsGood,
  compareLabel,
  compareTitle,
  trend,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  current: number;
  previous: number;
  upIsGood: boolean | null;
  /** Short, e.g. "last month". */
  compareLabel: string;
  /** Exact, e.g. "same days last month". */
  compareTitle: string;
  trend?: ReactNode;
}) {
  const change = percentChange(current, previous);
  const direction = change === null ? (current > 0 ? 1 : 0) : Math.sign(change);
  const deltaTone =
    direction === 0 || upIsGood === null
      ? "text-gray-500 dark:text-gray-400"
      : (direction > 0) === upIsGood
        ? "text-green-600 dark:text-green-400"
        : "text-red-600 dark:text-red-400";
  const Arrow = direction > 0 ? ArrowUp : direction < 0 ? ArrowDown : null;
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-5 shadow-theme-xs", TONES[tone].card)}>
      <div className={cn("pointer-events-none absolute -top-12 -right-12 size-36 rounded-full blur-2xl", TONES[tone].glow)} aria-hidden />
      <div className="relative flex items-center gap-4">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", TONES[tone].chip)}>
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</p>
          <p className="mt-0.5 truncate text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
      {/* The change under the value, the sparkline beside it in the corner. */}
      <div className="relative mt-2 flex min-h-11 items-end justify-between gap-2 pl-16">
        <p className={cn("flex items-center gap-1 pb-1 text-xs font-medium", deltaTone)} title={`Compared with ${compareTitle}`}>
          {Arrow && <Arrow className="size-3.5 shrink-0" aria-hidden />}
          <span className="whitespace-nowrap">{change === null ? "New" : `${change > 0 ? "+" : ""}${change.toFixed(1)}%`}</span>
          <span className="font-normal text-gray-500 dark:text-gray-400">vs {compareLabel}</span>
        </p>
        {trend && <div className="pointer-events-none -mr-2 -mb-2 shrink-0">{trend}</div>}
      </div>
    </div>
  );
}

export function KpiCards({ overview }: { overview: Overview }) {
  const previous = previousWording(overview);
  const compare = compareWording(overview);
  const { sales, purchase, warranty } = overview;
  const cards: ReactNode[] = [];
  if (sales)
    cards.push(
      <KpiCard
        key="sales"
        icon={ShoppingCart}
        tone="blue"
        label="Total sales"
        value={formatTaka(sales.total)}
        current={sales.total}
        previous={sales.previousTotal}
        upIsGood
        compareLabel={compare}
        compareTitle={previous}
        trend={<Sparkline values={sales.series.map((p) => p.amount)} color={SERIES.sales} label="Sales trend" />}
      />,
    );
  if (purchase)
    cards.push(
      <KpiCard
        key="purchase"
        icon={Truck}
        tone="green"
        label="Total purchase"
        value={formatTaka(purchase.total)}
        current={purchase.total}
        previous={purchase.previousTotal}
        upIsGood={null}
        compareLabel={compare}
        compareTitle={previous}
        trend={<Sparkline values={purchase.series.map((p) => p.amount)} color={SERIES.purchase} label="Purchase trend" />}
      />,
    );
  if (warranty)
    cards.push(
      <KpiCard
        key="claims"
        icon={ShieldCheck}
        tone="violet"
        label="Warranty claims"
        value={warranty.claims.toLocaleString("en-IN")}
        current={warranty.claims}
        previous={warranty.previousClaims}
        upIsGood={false}
        compareLabel={compare}
        compareTitle={previous}
      />,
      <KpiCard
        key="active"
        icon={Hourglass}
        tone="orange"
        label="Active warranty"
        value={warranty.activeCount.toLocaleString("en-IN")}
        current={warranty.activeCount}
        previous={warranty.previousActiveCount}
        upIsGood
        compareLabel={compare}
        compareTitle={previous}
      />,
    );
  if (cards.length === 0) return null;
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards}</div>;
}

/** The period's points, one per day (or month) up to the end of its axis; days after today have no value. */
function trendPoints(overview: Overview): { points: TrendPoint[]; ticks: number[] } {
  const sales = overview.sales!;
  const byMonth = overview.granularity === "month";
  const count = byMonth ? 12 : daysBetween(overview.from, overview.axisTo) + 1;
  const points: TrendPoint[] = Array.from({ length: count }, (_, i) => {
    const date = byMonth ? `${overview.from.slice(0, 4)}-${String(i + 1).padStart(2, "0")}-01` : addDays(overview.from, i);
    return {
      label: byMonth ? monthName(date) : shortDate(date),
      current: sales.series[i]?.amount ?? null,
      previous: sales.previousSeries[i]?.amount ?? null,
    };
  });
  const ticks = byMonth ? [0, 3, 6, 9, 11] : [0, 6, 13, 20, count - 1].filter((i, n, all) => i < count && all.indexOf(i) === n);
  return { points, ticks };
}

export function SalesTrendPanel({ overview }: { overview: Overview }) {
  const sales = overview.sales;
  if (!sales) return null;
  const { points, ticks } = trendPoints(overview);
  const period = DASHBOARD_PERIODS.find((p) => p.value === overview.period)!;
  const previousLabel = overview.period === "this-year" ? "Last year" : overview.period === "last-month" ? "Month before" : "Last month";
  return (
    <Panel
      icon={LineChart}
      tone="blue"
      title="Sales trend"
      actions={<Legend items={[{ label: period.label, dot: SERIES.sales.dot }, { label: previousLabel, dot: SERIES.previous.dot }]} />}
    >
      {sales.total === 0 && sales.previousSeries.every((p) => p.amount === 0) ? (
        <EmptyNote icon={LineChart} tone="blue">No posted sales in this period or the one before.</EmptyNote>
      ) : (
        <TrendChart points={points} ticks={ticks} currentLabel={period.label} previousLabel={previousLabel} />
      )}
    </Panel>
  );
}

/** Sales and purchases per week (month periods) or per month (the year). */
function barGroups(overview: Overview): BarGroup[] {
  const byMonth = overview.granularity === "month";
  const groups: BarGroup[] = byMonth
    ? Array.from({ length: 12 }, (_, i) => ({ label: monthName(`2000-${String(i + 1).padStart(2, "0")}-01`), values: {} }))
    : Array.from({ length: Math.ceil((daysBetween(overview.from, overview.axisTo) + 1) / 7) }, (_, i) => ({ label: `Week ${i + 1}`, values: {} }));
  const add = (key: string, series: { date: string; amount: number }[] | undefined) => {
    series?.forEach((point, i) => {
      const group = groups[byMonth ? i : Math.floor(i / 7)];
      if (group) group.values[key] = (group.values[key] ?? 0) + point.amount;
    });
  };
  add("sales", overview.sales?.series);
  add("purchase", overview.purchase?.series);
  return groups;
}

export function PurchaseVsSalesPanel({ overview }: { overview: Overview }) {
  const { sales, purchase } = overview;
  if (!sales && !purchase) return null;
  const series: BarSeries[] = [];
  if (sales) series.push({ key: "sales", label: "Sales", color: SERIES.sales });
  if (purchase) series.push({ key: "purchase", label: "Purchase", color: SERIES.purchase });
  const empty = (sales?.total ?? 0) === 0 && (purchase?.total ?? 0) === 0;
  return (
    <Panel
      icon={sales && purchase ? Scale : BarChart3}
      tone="green"
      title={sales && purchase ? "Purchase vs sales" : sales ? "Sales by week" : "Purchase by week"}
      actions={series.length > 1 ? <Legend items={series.map((s) => ({ label: s.label, dot: s.color.dot }))} /> : undefined}
    >
      {empty ? <EmptyNote icon={BarChart3} tone="green">No posted sales or purchases in this period.</EmptyNote> : <GroupedBarChart groups={barGroups(overview)} series={series} />}
    </Panel>
  );
}

export function WarrantyStatusPanel({ overview }: { overview: Overview }) {
  const warranty = overview.warranty;
  if (!warranty) return null;
  const total = warranty.inWarranty + warranty.underClaim + warranty.expired;
  return (
    <Panel icon={ShieldCheck} tone="violet" title="Warranty status">
      {total === 0 ? (
        <EmptyNote icon={ShieldCheck} tone="violet">No warranty cards yet. They are made when products with a warranty are sold.</EmptyNote>
      ) : (
        <DonutChart
          centerLabel="Active"
          centerValue={warranty.activeCount.toLocaleString("en-IN")}
          parts={[
            { name: "In warranty", value: warranty.inWarranty, ...STATUS_COLORS.good },
            { name: "Under claim", value: warranty.underClaim, ...STATUS_COLORS.warning },
            { name: "Expired", value: warranty.expired, ...STATUS_COLORS.ended },
          ]}
        />
      )}
    </Panel>
  );
}

const TYPE_BADGES: Record<string, string> = {
  Sale: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  Purchase: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Warranty: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

function statusBadge(status: string) {
  if (status === "Posted" || status === "Delivered" || status === "Ready") return "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400";
  if (status === "Cancelled") return "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  if (status === "Draft") return "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80";
  return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
}

/** "AwaitingApproval" -> "Awaiting approval". */
function words(status: string) {
  const spaced = status.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const TRANSACTION_HREF = {
  Sale: (id: number) => `/sales/invoices/${id}`,
  Purchase: (id: number) => `/purchase/invoices/${id}`,
  Warranty: (id: number) => `/warranty/service/jobs/${id}`,
} as const;

export function RecentTransactionsPanel({ overview, className }: { overview: Overview; className?: string }) {
  if (!overview.sales && !overview.purchase && !overview.warranty) return null;
  const rows = overview.recentTransactions;
  return (
    <Panel icon={Clock3} tone="indigo" title="Recent transactions" className={className}>
      {rows.length === 0 ? (
        <EmptyNote icon={Clock3} tone="indigo">No transactions yet.</EmptyNote>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-y border-indigo-100 bg-indigo-50/60 text-left text-xs font-medium text-indigo-900/70 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200/80">
                <th className="px-5 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 font-medium">Reference no.</th>
                <th className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th className="px-5 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => (
                <tr key={`${row.type}-${row.id}`}>
                  <td className="px-5 py-2.5 whitespace-nowrap text-gray-500 dark:text-gray-400">{shortDate(row.date, true)}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", TYPE_BADGES[row.type])}>{row.type}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={TRANSACTION_HREF[row.type](row.id)} className="font-medium text-brand-500 hover:underline">
                      {row.referenceNo}
                    </Link>
                    {row.partyName && <p className="max-w-44 truncate text-xs text-gray-500 dark:text-gray-400">{row.partyName}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap text-gray-800 tabular-nums dark:text-white/90">
                    {row.amount === null ? "—" : formatTaka(row.amount)}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", statusBadge(row.status))}>
                      {words(row.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function daysLeftTone(days: number) {
  if (days <= 15) return "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400";
  if (days <= 30) return "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  return "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
}

export function ExpiringWarrantyPanel({ overview, className }: { overview: Overview; className?: string }) {
  const warranty = overview.warranty;
  if (!warranty) return null;
  return (
    <Panel
      icon={Bell}
      tone="amber"
      title="Warranty expiring soon"
      className={className}
      actions={
        <Link href="/warranty/service/cards" className="flex items-center gap-1 text-sm font-medium text-brand-500 hover:underline">
          View all <ArrowRight className="size-4" aria-hidden />
        </Link>
      }
    >
      {warranty.expiringSoon.length === 0 ? (
        <EmptyNote icon={Bell} tone="amber">No warranty ends in the next 60 days.</EmptyNote>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {warranty.expiringSoon.map((item) => (
            <li key={item.warrantyRegistrationId}>
              <Link href={`/warranty/service/cards/${item.warrantyRegistrationId}`} className="flex items-center gap-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]">
                  {item.productImageUrl ? (
                    // A file on the API's storage: next/image would need its host configured.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.productImageUrl} alt="" className="size-full object-contain" />
                  ) : (
                    <Package className="size-5 text-gray-400" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-gray-800 dark:text-white/90">{item.productName}</span>
                  <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                    {[item.serialNo, item.customerName].filter(Boolean).join(" · ") || item.warrantyNo}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{shortDate(item.endDate, true)}</span>
                  <span className={cn("mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", daysLeftTone(item.daysLeft))}>
                    {item.daysLeft === 0 ? "Today" : `${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"}`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** Sales by product category: the four largest and the rest as "Others". */
export function SalesByCategoryPanel({ overview, className }: { overview: Overview; className?: string }) {
  const sales = overview.sales;
  if (!sales) return null;
  const top = sales.byCategory.slice(0, 4);
  const rest = sales.byCategory.slice(4).reduce((sum, c) => sum + c.amount, 0);
  const parts = [
    ...top.map((c, i) => ({ name: c.name, value: c.amount, ...CATEGORY_COLORS[i] })),
    ...(rest > 0 ? [{ name: "Others", value: rest, ...OTHER_COLOR }] : []),
  ];
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  return (
    <Panel icon={PieChart} tone="orange" title="Sales by category" className={className}>
      {total <= 0 ? (
        <EmptyNote icon={PieChart} tone="orange">No posted sales in this period.</EmptyNote>
      ) : (
        <DonutChart parts={parts} centerLabel="Total" centerValue={`৳ ${compactTaka(total)}`} valueFormat="taka" />
      )}
    </Panel>
  );
}
