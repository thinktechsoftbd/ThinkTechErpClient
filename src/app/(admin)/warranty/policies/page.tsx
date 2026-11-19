import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, ScrollText, Trash2 } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { ConfirmActionButton } from "@/core/crud/confirm-action-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { SortHeader, type SortDirection } from "@/core/crud/sort-header";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Card } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { canManageWarranty } from "@/modules/warranty/access";
import { deletePolicyAction, savePolicyAction } from "@/modules/warranty/actions/policies";
import { warrantyApi } from "@/modules/warranty/api";
import { PolicyFields } from "@/modules/warranty/components/policy-fields";
import { WARRANTY_MANAGE_PERMISSION, policyPeriod } from "@/modules/warranty/types";

export const metadata: Metadata = { title: "Warranty Policies" };

const basePath = "/warranty/policies";
const PAGE_SIZE = 30;
const SORTS = ["name", "period", "products", "status", "updated"] as const;
type Sort = (typeof SORTS)[number];
type Props = PageProps<"/warranty/policies">;

const muted = "text-gray-500 dark:text-gray-400";

export default function WarrantyPoliciesPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Warranty Policies"
        description="The warranty terms products are sold with. Each sale copies them onto its warranty cards."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty/service" }, { label: "Warranty Policies" }]}
        actions={
          <Suspense>
            <PermissionOnly code={WARRANTY_MANAGE_PERMISSION}>
              <FormModalButton mode="create" label="New policy" title="New warranty policy" action={savePolicyAction.bind(null, null)} submitLabel="Create">
                <PolicyFields />
              </FormModalButton>
            </PermissionOnly>
          </Suspense>
        }
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={7} />}>
          <PolicyList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

// Server-side: the API filters (name or terms, status), sorts and pages; 30 per page.
async function PolicyList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q)?.trim() || undefined;
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const sortParam = firstParam(query.sort);
  const sort: Sort | undefined = SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const offset = parseOffset(query.offset);
  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => warrantyApi.policies.list({ search, isActive, sort, direction, limit: PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;
  const canManage = canManageWarranty(session);
  const active = isActive === undefined ? undefined : String(isActive);
  // Sorting keeps the search and filter; paging keeps all three.
  const sorting = { sort: sort ?? "", direction, basePath, query: { q: search, active } };

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white/90">
          {result.ok ? `${formatNumber(result.data.totalCount)} polic${result.data.totalCount === 1 ? "y" : "ies"}` : "Policies"}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Name or terms"
          filters={[{ name: "active", label: "Status", value: activeParam, options: ACTIVE_FILTER_OPTIONS, allLabel: "All statuses" }]}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={filtered ? "No policies match these filters" : "No warranty policies yet"}
          description={filtered ? undefined : "Add the warranties you sell with, e.g. 1 Year Warranty, then give them to products."}
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <SortHeader label="Policy" column="name" {...sorting} />
                <SortHeader label="Period" column="period" {...sorting} />
                <TH>Covers</TH>
                <SortHeader label="Products" column="products" {...sorting} className="text-right" />
                <SortHeader label="Status" column="status" {...sorting} />
                <SortHeader label="Updated" column="updated" {...sorting} />
                {canManage && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span>
                    {row.terms && (
                      <span className={`block max-w-md truncate text-xs ${muted}`} title={row.terms}>
                        {row.terms}
                      </span>
                    )}
                  </TD>
                  <TD className="whitespace-nowrap">{policyPeriod(row)}</TD>
                  <TD>
                    <span className="inline-flex gap-1">
                      {row.coversParts && <Badge>Parts</Badge>}
                      {row.coversLabor && <Badge>Service</Badge>}
                    </span>
                  </TD>
                  <TD className="text-right tabular-nums">
                    {row.productCount > 0 ? (
                      <Link href={`/warranty/products?policy=${row.id}`} className="text-brand-500 hover:underline">
                        {formatNumber(row.productCount)}
                      </Link>
                    ) : (
                      <span className={muted}>0</span>
                    )}
                  </TD>
                  <TD>
                    <StatusBadge active={row.isActive} />
                  </TD>
                  <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(row.updatedAt ?? row.createdAt)}</TD>
                  {canManage && (
                    <TD className="text-right">
                      <span className="inline-flex items-center gap-1">
                        <FormModalButton
                          mode="edit"
                          iconOnly
                          icon={<Pencil className="size-4" aria-hidden />}
                          label={`Edit ${row.name}`}
                          title="Edit warranty policy"
                          action={savePolicyAction.bind(null, row.id)}
                          submitLabel="Save changes"
                          description="Cards already issued keep the terms they were sold with; the change applies to later sales."
                        >
                          <PolicyFields value={row} />
                        </FormModalButton>
                        <ConfirmActionButton
                          action={deletePolicyAction.bind(null, row.id)}
                          label={`Delete ${row.name}`}
                          icon={<Trash2 className="size-4" aria-hidden />}
                          tone="delete"
                          title="Delete warranty policy"
                          message={
                            row.productCount > 0 ? (
                              <>
                                {formatNumber(row.productCount)} product(s) use{" "}
                                <strong className="text-gray-800 dark:text-white/90">{row.name}</strong>, so it can&apos;t be
                                deleted. Deactivate it instead.
                              </>
                            ) : (
                              <>
                                Delete <strong className="text-gray-800 dark:text-white/90">{row.name}</strong>? This cannot be
                                undone.
                              </>
                            )
                          }
                          confirmLabel="Delete"
                          pendingLabel="Deleting…"
                          danger
                        />
                      </span>
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath={basePath}
            query={{ q: search, active, sort, dir: direction === "asc" ? undefined : direction }}
            offset={offset}
            limit={PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
