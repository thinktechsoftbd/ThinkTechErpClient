import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Boxes,
  CalendarClock,
  ChartBar,
  ClipboardCheck,
  Coins,
  FileSpreadsheet,
  FolderTree,
  HandCoins,
  Package,
  PackagePlus,
  Ruler,
  ScrollText,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Undo2,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { tryApi, type ApiResult } from "@/core/api/client";
import { canAccessModule } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { Alert } from "@/core/ui/alert";
import { Badge } from "@/core/ui/badge";
import { LinkButton } from "@/core/ui/button";
import { StatCard, StatGridSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { inventoryApi } from "@/modules/inventory/api";
import { inventoryModule } from "@/modules/inventory/module";
import { getInventorySettings } from "@/modules/inventory/queries";
import { salesModule } from "@/modules/sales/module";

export const metadata: Metadata = { title: "Inventory" };

/** sales: a Sales screen (own permission, shown in the Inventory menu). */
type QuickLink = { href: string; icon: LucideIcon; hint: string; sales?: boolean };

/** The module's menu, grouped; labels come from the module definition. */
const GROUPS: { title: string; links: QuickLink[] }[] = [
  {
    title: "Settings",
    links: [
      { href: "/inventory/products", icon: Package, hint: "Items, packs, barcodes and prices" },
      { href: "/inventory/categories", icon: FolderTree, hint: "Groups such as Fertilizer > Urea" },
      { href: "/inventory/brands", icon: Tag, hint: "Makers and labels" },
      { href: "/inventory/units", icon: Ruler, hint: "kg, pcs, bag, box, feet" },
      { href: "/inventory/warehouses", icon: Warehouse, hint: "Shops and godowns" },
      { href: "/inventory/settings", icon: Settings, hint: "Currency, fiscal year, stock rules" },
      { href: "/sales/customers", icon: Users, hint: "Buyers on credit, terms and limits", sales: true },
    ],
  },
  {
    title: "Transactions",
    links: [
      { href: "/sales/invoices", icon: ShoppingBag, hint: "Cash and credit sales at the counter", sales: true },
      { href: "/sales/receipts", icon: Wallet, hint: "Collect customers' dues", sales: true },
      { href: "/sales/returns", icon: Undo2, hint: "Goods customers bring back", sales: true },
      { href: "/inventory/opening-stock", icon: PackagePlus, hint: "The stock you start with" },
      { href: "/inventory/adjustments", icon: SlidersHorizontal, hint: "Damage, expiry, loss, own use" },
      { href: "/inventory/transfers", icon: ArrowLeftRight, hint: "Move stock between places" },
      { href: "/inventory/counts", icon: ClipboardCheck, hint: "Physical counts and differences" },
    ],
  },
  {
    title: "Reports",
    links: [
      { href: "/inventory/reports/stock-on-hand", icon: Boxes, hint: "What is in stock now" },
      { href: "/inventory/reports/stock-card", icon: ScrollText, hint: "One product's ins and outs" },
      { href: "/inventory/reports/valuation", icon: Coins, hint: "Stock value by group" },
      { href: "/inventory/reports/movements", icon: ArrowDownUp, hint: "Every stock movement" },
      { href: "/inventory/reports/reorder", icon: BellRing, hint: "Items to buy again" },
      { href: "/inventory/reports/expiry", icon: CalendarClock, hint: "Batches near or past expiry" },
      { href: "/sales/reports/register", icon: FileSpreadsheet, hint: "Sales with cost and profit", sales: true },
      { href: "/sales/reports/by-product", icon: ChartBar, hint: "What sells, and its margin", sales: true },
      { href: "/sales/reports/customer-dues", icon: HandCoins, hint: "Who owes what, and how late", sales: true },
      { href: "/sales/reports/customer-ledger", icon: BookOpen, hint: "One customer's account", sales: true },
    ],
  },
];

const navLabel = (href: string) =>
  [...inventoryModule.nav, ...salesModule.nav].find((item) => item.href === href)?.label ?? href;

export default function InventoryOverviewPage() {
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Products, stock in each shop and godown, and the documents and reports that move and value it."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory" }]}
      />
      <div className="space-y-8">
        <Suspense>
          <SettingsCallout />
        </Suspense>
        <Suspense fallback={<StatGridSkeleton count={4} />}>
          <InventoryStats />
        </Suspense>
        <Suspense fallback={<QuickLinkGroups showSales={false} />}>
          <PermittedQuickLinks />
        </Suspense>
      </div>
    </>
  );
}

/** The Sales screens show only to users with the Sales permission. */
async function PermittedQuickLinks() {
  const session = await requireSession();
  return <QuickLinkGroups showSales={canAccessModule(session, salesModule)} />;
}

function QuickLinkGroups({ showSales }: { showSales: boolean }) {
  return (
    <>
      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">{group.title}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.links
              .filter((link) => showSales || !link.sales)
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-800"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                    <link.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-800 group-hover:text-brand-600 dark:text-white/90 dark:group-hover:text-brand-300">
                      {navLabel(link.href)}
                    </span>
                    <span className="block text-sm text-gray-500 dark:text-gray-400">{link.hint}</span>
                  </span>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}

async function SettingsCallout() {
  const settings = await getInventorySettings();
  if (!settings.ok || settings.data.isConfigured) return null;
  return (
    <Alert tone="warning" title="Inventory settings aren't saved yet">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>Check the base currency, fiscal year and stock rules, and save them before entering purchases or stock.</p>
        <LinkButton href="/inventory/settings" variant="outline" size="sm" className="shrink-0">
          Open settings
        </LinkButton>
      </div>
    </Alert>
  );
}

async function InventoryStats() {
  const page = { limit: 1, offset: 0 };
  const [settings, onHand, products, reorder, expiry] = await Promise.all([
    getInventorySettings(),
    tryApi(() => inventoryApi.reports.stockOnHand(page)),
    tryApi(() => inventoryApi.products.list({ ...page, isActive: true })),
    tryApi(() => inventoryApi.reports.reorder(page)),
    tryApi(() => inventoryApi.reports.expiry(page)),
  ]);
  const currency = settings.ok ? settings.data.baseCurrency : null;
  const alertDays = settings.ok ? settings.data.expiryAlertDays : null;

  const cards: { label: string; href: string; icon: LucideIcon; result: ApiResult<ReactNode>; hint: ReactNode }[] = [
    {
      label: "Stock value",
      href: "/inventory/reports/valuation",
      icon: Wallet,
      result: mapResult(onHand, (data) => `${formatAmount(data.totals.stockValue ?? 0)}${currency ? ` ${currency}` : ""}`),
      hint: onHand.ok ? `${formatNumber(onHand.data.totalCount)} product(s) in stock` : undefined,
    },
    {
      label: "Active products",
      href: "/inventory/products?active=true",
      icon: Package,
      result: mapResult(products, (data) => formatNumber(data.totalCount)),
      hint: "Ready to buy and sell",
    },
    {
      label: "Reorder alerts",
      href: "/inventory/reports/reorder",
      icon: BellRing,
      result: mapResult(reorder, (data) => formatNumber(data.totalCount)),
      hint: "At or below the reorder level",
    },
    {
      label: "Expiry alerts",
      href: "/inventory/reports/expiry",
      icon: CalendarClock,
      result: mapResult(expiry, (data) => formatNumber(data.totalCount)),
      hint: alertDays !== null ? `Batches expired or expiring within ${alertDays} days` : "Batches near or past expiry",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.label} href={card.href} className="rounded-2xl transition hover:shadow-theme-lg">
          <StatCard
            label={card.label}
            icon={card.icon}
            value={card.result.ok ? card.result.data : <Badge tone="error">Unavailable</Badge>}
            hint={card.result.ok ? card.hint : card.result.error.message}
          />
        </Link>
      ))}
    </div>
  );
}

function mapResult<T, U>(result: ApiResult<T>, map: (data: T) => U): ApiResult<U> {
  return result.ok ? { ok: true, data: map(result.data) } : result;
}
