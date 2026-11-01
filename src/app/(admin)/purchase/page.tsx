import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  Banknote,
  BookOpen,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Hourglass,
  Layers,
  Package,
  PackageCheck,
  Percent,
  Plus,
  Receipt,
  ScrollText,
  ShoppingBag,
  Truck,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { tryApi, type ApiResult } from "@/core/api/client";
import { serverEnv } from "@/core/config/server-env";
import { PermissionOnly } from "@/core/crud/permission-only";
import { LinkButton } from "@/core/ui/button";
import { Card, CardHeader } from "@/core/ui/card";
import { Skeleton, StatCard } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { formatDate, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import type { ReportPage } from "@/modules/inventory/types";
import { purchaseApi } from "@/modules/purchase/api";
import { purchaseModule } from "@/modules/purchase/module";
import { PURCHASE_MANAGE_PERMISSION } from "@/modules/purchase/types";

export const metadata: Metadata = { title: "Purchase" };

type QuickLink = { label: string; href: string; description: string; icon: LucideIcon };

// Paths as in purchaseModule.nav.
const LINK_GROUPS: { title: string; links: QuickLink[] }[] = [
  {
    title: "Settings",
    links: [
      { label: "Suppliers", href: "/purchase/suppliers", description: "Contacts, terms, opening balances", icon: Truck },
      { label: "Tax Rates", href: "/purchase/tax-rates", description: "VAT, SD and other single taxes", icon: Percent },
      { label: "Tax Groups", href: "/purchase/tax-groups", description: "Taxes charged together, e.g. SD + VAT", icon: Layers },
    ],
  },
  {
    title: "Transactions",
    links: [
      { label: "Purchase Invoices", href: "/purchase/invoices", description: "Cash and credit purchases", icon: Receipt },
      { label: "Purchase Orders", href: "/purchase/orders", description: "What you ordered from suppliers", icon: ClipboardList },
      { label: "Goods Receipts", href: "/purchase/goods-receipts", description: "Goods received, before the bill", icon: PackageCheck },
      { label: "Purchase Returns", href: "/purchase/returns", description: "Goods sent back to suppliers", icon: Undo2 },
      { label: "Supplier Payments", href: "/purchase/payments", description: "Payments, cheques and refunds", icon: Banknote },
    ],
  },
  {
    title: "Reports",
    links: [
      { label: "Supplier Ledger", href: "/purchase/reports/supplier-ledger", description: "Every entry with a running balance", icon: BookOpen },
      { label: "Supplier Dues", href: "/purchase/reports/supplier-dues", description: "What you owe, by age", icon: Hourglass },
      { label: "Purchase Register", href: "/purchase/reports/register", description: "Invoices with tax and dues", icon: ScrollText },
      { label: "Purchase by Product", href: "/purchase/reports/by-product", description: "Quantities and average prices", icon: Package },
    ],
  },
];

export default function PurchasePage() {
  return (
    <>
      <PageHeader
        title="Purchase"
        description={purchaseModule.description}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Purchase" }]}
        actions={
          <Suspense>
            <PermissionOnly code={PURCHASE_MANAGE_PERMISSION}>
              <LinkButton href="/purchase/invoices/new">
                <Plus className="size-5" aria-hidden /> New purchase
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Suspense fallback={<StatsSkeleton />}>
        <PurchaseStats />
      </Suspense>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {LINK_GROUPS.map((group) => (
          <Card key={group.title}>
            <CardHeader title={group.title} />
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-gray-50 sm:px-6 dark:hover:bg-white/[0.02]"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
                      <link.icon className="size-4.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-800 group-hover:text-brand-500 dark:text-white/90">
                        {link.label}
                      </span>
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{link.description}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-gray-400 group-hover:text-brand-500" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-36 rounded-2xl" />
      ))}
    </div>
  );
}

/** Today as YYYY-MM-DD in APP_TIME_ZONE (or the server's zone). */
function todayInAppZone() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: serverEnv.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function total<T>(result: ApiResult<ReportPage<T>>, key: string) {
  return result.ok ? formatAmount(result.data.totals[key] ?? 0) : "—";
}

async function PurchaseStats() {
  await connection();
  const to = todayInAppZone();
  const from = `${to.slice(0, 8)}01`;

  const [dues, register] = await Promise.all([
    tryApi(() => purchaseApi.reports.supplierDues({ limit: 1, offset: 0 })),
    tryApi(() => purchaseApi.reports.register({ from, to, limit: 1, offset: 0 })),
  ]);
  const duesError = dues.ok ? undefined : `Couldn't load: ${dues.error.message}`;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatLink href="/purchase/reports/supplier-dues">
        <StatCard
          label="Owed to suppliers"
          value={total(dues, "balance")}
          icon={Wallet}
          hint={duesError ?? "Net of advances, in base currency"}
        />
      </StatLink>
      <StatLink href="/purchase/reports/supplier-dues">
        <StatCard label="Overdue" value={total(dues, "overdue")} icon={CalendarClock} hint={duesError ?? "Past the due date"} />
      </StatLink>
      <StatLink href={`/purchase/reports/register?from=${from}&to=${to}`}>
        <StatCard
          label="Purchases this month"
          value={total(register, "total")}
          icon={ShoppingBag}
          hint={
            register.ok
              ? `${formatNumber(register.data.totalCount)} invoice(s) since ${formatDate(from)}`
              : `Couldn't load: ${register.error.message}`
          }
        />
      </StatLink>
    </div>
  );
}

function StatLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="block rounded-2xl transition hover:shadow-theme-lg focus-visible:ring-3 focus-visible:ring-brand-500/20">
      {children}
    </Link>
  );
}
