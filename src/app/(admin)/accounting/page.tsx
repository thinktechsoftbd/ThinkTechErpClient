import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  BanknoteArrowUp,
  BookOpen,
  ChevronRight,
  FilePen,
  HandCoins,
  Landmark,
  ListTree,
  NotebookPen,
  Plus,
  Scale,
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
import type { PagedResult } from "@/modules/security/types";
import { accountingApi } from "@/modules/accounting/api";
import { accountingModule } from "@/modules/accounting/module";
import { ACCOUNTING_MANAGE_PERMISSION, type Voucher } from "@/modules/accounting/types";

export const metadata: Metadata = { title: "Accounting" };

type QuickLink = { label: string; href: string; description: string; icon: LucideIcon };

// Paths as in accountingModule.nav.
const LINK_GROUPS: { title: string; links: QuickLink[] }[] = [
  {
    title: "Settings",
    links: [
      {
        label: "Chart of Accounts",
        href: "/accounting/chart-of-accounts",
        description: "Parent → account → main → map → sub class",
        icon: ListTree,
      },
    ],
  },
  {
    title: "Transactions",
    links: [
      { label: "Vouchers", href: "/accounting/vouchers", description: "Journal, payment, receipt and contra", icon: NotebookPen },
      { label: "Bill Payment", href: "/accounting/bill-payments", description: "Supplier bill payment", icon: BanknoteArrowUp },
      { label: "Bill Collection", href: "/accounting/bill-collections", description: "Customer bill collection", icon: HandCoins },
    ],
  },
  {
    title: "Reports",
    links: [
      {
        label: "Subsidiary Ledger",
        href: "/accounting/reports/subsidiary-ledger",
        description: "By ledger head, supplier or customer, and period",
        icon: BookOpen,
      },
      { label: "Trial Balance", href: "/accounting/reports/trial-balance", description: "Every head's debits and credits", icon: Scale },
      { label: "Balance Sheet", href: "/accounting/reports/balance-sheet", description: "Assets, liabilities and equity", icon: Landmark },
    ],
  },
];

export default function AccountingPage() {
  return (
    <>
      <PageHeader
        title="Accounting"
        description={accountingModule.description}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Accounting" }]}
        actions={
          <Suspense>
            <PermissionOnly code={ACCOUNTING_MANAGE_PERMISSION}>
              <LinkButton href="/accounting/vouchers/new">
                <Plus className="size-5" aria-hidden /> New voucher
              </LinkButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Suspense fallback={<StatsSkeleton />}>
        <AccountingStats />
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

function count(result: ApiResult<PagedResult<Voucher>>) {
  return result.ok ? formatNumber(result.data.totalCount) : "—";
}

async function AccountingStats() {
  await connection();
  const to = todayInAppZone();
  const from = `${to.slice(0, 8)}01`;

  const [drafts, posted, bills] = await Promise.all([
    tryApi(() => accountingApi.vouchers.list({ status: "Draft", limit: 1, offset: 0 })),
    tryApi(() => accountingApi.vouchers.list({ status: "Posted", from, to, limit: 1, offset: 0 })),
    tryApi(() => accountingApi.billPayments.list({ status: "Posted", from, to, limit: 1, offset: 0 })),
  ]);
  const hint = (result: ApiResult<unknown>, text: string) => (result.ok ? text : `Couldn't load: ${result.error.message}`);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatLink href="/accounting/vouchers?status=Draft">
        <StatCard label="Draft vouchers" value={count(drafts)} icon={FilePen} hint={hint(drafts, "Saved, waiting to be posted")} />
      </StatLink>
      <StatLink href={`/accounting/vouchers?status=Posted&from=${from}&to=${to}`}>
        <StatCard label="Posted this month" value={count(posted)} icon={NotebookPen} hint={hint(posted, `Vouchers since ${formatDate(from)}`)} />
      </StatLink>
      <StatLink href={`/accounting/bill-payments?from=${from}&to=${to}`}>
        <StatCard label="Bill payments this month" value={count(bills)} icon={BanknoteArrowUp} hint={hint(bills, "Paid to suppliers")} />
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
