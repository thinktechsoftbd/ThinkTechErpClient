import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { FormModalButton } from "@/core/crud/form-modal-button";
import { ACTIVE_FILTER_OPTIONS, CRUD_PAGE_SIZE, FilterSelect, ListToolbar, parseActiveFilter } from "@/core/crud/list-toolbar";
import { PermissionOnly } from "@/core/crud/permission-only";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Card, CardHeader } from "@/core/ui/card";
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
        <Suspense fallback={<TableSkeleton columns={6} />}>
          <PolicyList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function PolicyList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const activeParam = firstParam(query.active);
  const isActive = parseActiveFilter(activeParam);
  const offset = parseOffset(query.offset);
  const [session, result] = await Promise.all([
    requireSession(),
    tryApi(() => warrantyApi.policies.list({ search, isActive, limit: CRUD_PAGE_SIZE, offset })),
  ]);
  const filtered = Boolean(search) || isActive !== undefined;
  const canManage = canManageWarranty(session);

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} polic${result.data.totalCount === 1 ? "y" : "ies"}` : "Policies"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Search policies" filtered={filtered}>
            <FilterSelect name="active" label="Status" value={activeParam} options={ACTIVE_FILTER_OPTIONS} allLabel="All statuses" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
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
                <TH>Policy</TH>
                <TH>Period</TH>
                <TH>Covers</TH>
                <TH className="text-right">Products</TH>
                <TH>Status</TH>
                <TH>Updated</TH>
                {canManage && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((row) => (
                <TR key={row.id}>
                  <TD>
                    <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span>
                    {row.terms && <span className={`block max-w-md truncate text-xs ${muted}`} title={row.terms}>{row.terms}</span>}
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
                        <FormModalButton mode="edit" label="Edit" title="Edit warranty policy" action={savePolicyAction.bind(null, row.id)} submitLabel="Save changes"
                          description="Cards already issued keep the terms they were sold with; the change applies to later sales.">
                          <PolicyFields value={row} />
                        </FormModalButton>
                        <ConfirmDeleteButton
                          action={deletePolicyAction.bind(null, row.id)}
                          itemLabel={`policy "${row.name}"`}
                          message={row.productCount > 0 ? `${formatNumber(row.productCount)} product(s) use it, so it can't be deleted. Deactivate it instead.` : undefined}
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
            query={{ q: search, active: isActive === undefined ? undefined : String(isActive) }}
            offset={offset}
            limit={CRUD_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
