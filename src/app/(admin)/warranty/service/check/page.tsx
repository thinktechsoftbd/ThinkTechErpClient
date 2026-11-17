import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Search, SearchCheck, ShieldOff } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { rowAction } from "@/core/crud/row-action";
import { Input } from "@/core/forms/fields";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { firstParam } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate } from "@/core/utils/format";
import { canManageWarranty } from "@/modules/warranty/access";
import { warrantyApi } from "@/modules/warranty/api";
import { CardsTable } from "@/modules/warranty/components/cards-table";
import { DeskTabs } from "@/modules/warranty/components/desk-tabs";
import { JobsTable } from "@/modules/warranty/components/jobs-table";

export const metadata: Metadata = { title: "Warranty check" };

type Props = PageProps<"/warranty/service/check">;

const muted = "text-gray-500 dark:text-gray-400";

export default function WarrantyCheckPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Warranty & Service"
        description="Is it under warranty? Look a unit up by its serial no., the warranty card or invoice no., or the customer's mobile."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty/service" }, { label: "Warranty check" }]}
      />
      <Card>
        <DeskTabs active="check" />
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <CheckResults searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function CheckResults({ searchParams }: Pick<Props, "searchParams">) {
  const q = firstParam((await searchParams).q)?.trim().slice(0, 100);
  const [session, result] = await Promise.all([requireSession(), q ? tryApi(() => warrantyApi.cards.check(q)) : Promise.resolve(null)]);
  const canManage = canManageWarranty(session);

  return (
    <>
      <CardBody>
        <Form action="/warranty/service/check" className="flex max-w-2xl flex-wrap gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <Input key={q ?? ""} name="q" defaultValue={q} maxLength={100} autoFocus placeholder="Serial no., WC-…, INV-… or mobile" className="pl-9" aria-label="Search" />
          </div>
          <Button type="submit">Check</Button>
        </Form>
      </CardBody>
      {!q ? (
        <EmptyState icon={SearchCheck} title="Check a unit's warranty" description="Scan or type the serial number printed on the device, or ask for the warranty card or the sales memo." />
      ) : !result || !result.ok ? (
        result && !result.ok ? <ApiErrorState error={result.error} /> : null
      ) : result.data.cards.length === 0 && result.data.serials.length === 0 && result.data.jobs.length === 0 ? (
        <EmptyState
          icon={ShieldOff}
          title={`Nothing found for "${q}"`}
          description="Not sold here (or sold before the system), so it's a paid job; register a warranty card for an old sale from the Warranty cards tab."
          action={
            canManage ? (
              <Link href="/warranty/service/jobs/new?type=Paid" className={rowAction("positive")}>
                Open a paid job
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2 pb-2">
          {result.data.cards.length > 0 && (
            <section>
              <CardHeader title={`Warranty cards (${result.data.cards.length})`} />
              <CardsTable rows={result.data.cards} canManage={canManage} />
            </section>
          )}
          {result.data.serials.some((s) => !s.hasActiveCard) && (
            <section>
              <CardHeader title="Units on record without a card in force" description="Sold without a warranty, or the card was voided or replaced." />
              <Table>
                <THead>
                  <tr>
                    <TH>Serial no.</TH>
                    <TH>Product</TH>
                    <TH>Now</TH>
                    <TH>Last sale</TH>
                  </tr>
                </THead>
                <TBody>
                  {result.data.serials
                    .filter((s) => !s.hasActiveCard)
                    .map((s) => (
                      <TR key={s.serialNumberId}>
                        <TD className="font-medium text-gray-800 dark:text-white/90">{s.serialNo}</TD>
                        <TD>
                          {s.productName} <span className={muted}>({s.productCode})</span>
                        </TD>
                        <TD>
                          <Badge>{s.status === "InStock" ? "In stock" : s.status}</Badge>
                        </TD>
                        <TD>
                          {s.salesInvoiceId ? (
                            <>
                              <Link href={`/sales/invoices/${s.salesInvoiceId}`} className="text-brand-500 hover:underline">
                                {s.invoiceNo}
                              </Link>
                              <span className={`block text-xs ${muted}`}>
                                {s.invoiceDate && formatDate(s.invoiceDate)}
                                {s.customerName && ` · ${s.customerName}`}
                              </span>
                            </>
                          ) : (
                            <span className={muted}>Not sold</span>
                          )}
                        </TD>
                      </TR>
                    ))}
                </TBody>
              </Table>
            </section>
          )}
          {result.data.jobs.length > 0 && (
            <section>
              <CardHeader title={`Earlier service jobs (${result.data.jobs.length})`} />
              <JobsTable rows={result.data.jobs} />
            </section>
          )}
        </div>
      )}
    </>
  );
}
