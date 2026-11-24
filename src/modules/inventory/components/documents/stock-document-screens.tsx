import "server-only";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardList, PackagePlus, Pencil } from "lucide-react";
import { tryApi, type ApiResult } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { AutoSearchToolbar } from "@/core/crud/auto-search-toolbar";
import { ConfirmDeleteButton } from "@/core/crud/confirm-delete-button";
import { LockedRowActions } from "@/core/crud/locked-row-actions";
import { rowIconAction } from "@/core/crud/row-action";
import { SortHeader, type SortDirection } from "@/core/crud/sort-header";
import { DocumentActionButton } from "@/core/documents/document-action-button";
import { DocumentStatusBadge } from "@/core/documents/document-status";
import { Facts, TotalsList } from "@/core/documents/facts";
import { Alert } from "@/core/ui/alert";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { LinkButton } from "@/core/ui/button";
import { Card, CardBody, CardHeader } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";
import { PageHeader, type Crumb } from "@/core/ui/page-header";
import { Pagination, firstParam } from "@/core/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDate, formatDateTime, formatNumber } from "@/core/utils/format";
import { formatAmount } from "@/core/utils/number";
import { parseIdParam } from "@/core/utils/params";
import { canManageInventory } from "../../access";
import {
  cancelAdjustmentAction,
  deleteAdjustmentAction,
  deleteAdjustmentFromListAction,
  deleteOpeningStockAction,
  deleteOpeningStockFromListAction,
  postAdjustmentAction,
  saveAdjustmentAction,
  saveOpeningStockAction,
  saveTransferAction,
} from "../../actions/documents";
import { inventoryApi } from "../../api";
import { getInventoryOptions, getInventorySettings } from "../../queries";
import { ADJUSTMENT_REASONS, label, type StockAdjustment } from "../../types";
import { readDocumentFilters, warehouseFilterOptions, type ListSearchParams } from "./list-filters";
import { StockDocumentEditor, type StockEditorOptions } from "./stock-document-editor";
import { StockLinesTable } from "./stock-lines-table";

// Opening stock and stock adjustments are the same API document (an adjustment); opening stock
// is the one with reason "Opening". These screens serve both lists.

export type AdjustmentKind = "opening" | "adjustment";

export const OPENING_REASON = "Opening";

const kinds = {
  opening: {
    basePath: "/inventory/opening-stock",
    title: "Opening Stock",
    noun: "opening stock",
  },
  adjustment: {
    basePath: "/inventory/adjustments",
    title: "Stock Adjustments",
    noun: "adjustment",
  },
} as const;

export const adjustmentBasePath = (kind: AdjustmentKind) => kinds[kind].basePath;
const kindOf = (adjustment: StockAdjustment): AdjustmentKind => (adjustment.reason === OPENING_REASON ? "opening" : "adjustment");

export const STATUS_OPTIONS = [
  { value: "Draft", label: "Draft" },
  { value: "Posted", label: "Posted" },
  { value: "Cancelled", label: "Cancelled" },
];

const REASON_OPTIONS = [...ADJUSTMENT_REASONS, "CountDifference"].map((reason) => ({ value: reason, label: label(reason) }));

/** Dashboard › Inventory › ... */
export function inventoryCrumbs(...items: Crumb[]): Crumb[] {
  return [{ label: "Dashboard", href: "/dashboard" }, { label: "Inventory", href: "/inventory" }, ...items];
}

/** Warehouses and the default warehouse for the stock document editor. */
export async function loadStockEditorOptions(): Promise<ApiResult<StockEditorOptions>> {
  const [options, settings] = await Promise.all([getInventoryOptions(), getInventorySettings()]);
  if (!options.ok) return options;
  return {
    ok: true,
    data: {
      warehouses: options.data.warehouses.map((w) => ({ id: w.id, name: w.name, isActive: w.isActive })),
      defaultWarehouseId: settings.ok ? settings.data.defaultWarehouseId : null,
    },
  };
}

/** The products of a draft's lines, with all their units. */
export function loadLineProducts(lines: { productId: number }[]) {
  return tryApi(() => inventoryApi.getLineProducts(lines.map((l) => l.productId)));
}

// ---- List

const ADJUSTMENT_PAGE_SIZE = 30;
const ADJUSTMENT_SORTS = ["number", "date", "warehouse", "reason", "lines", "value", "status"] as const;
type AdjustmentSort = (typeof ADJUSTMENT_SORTS)[number];

/**
 * Server-side: the API filters (number or remarks; warehouse, reason, status, dates), sorts and pages; 30 per page,
 * newest first unless a column is chosen. Filters apply as you type or choose.
 */
export async function AdjustmentList({ kind, searchParams }: { kind: AdjustmentKind; searchParams: Promise<ListSearchParams> }) {
  const query = await searchParams;
  const filters = readDocumentFilters(query);
  const { warehouseId, from, to, offset } = filters;
  const search = filters.search?.trim() || undefined;
  const status = STATUS_OPTIONS.some((option) => option.value === filters.status) ? filters.status : undefined;
  const reasonParam = firstParam(query.reason);
  const reason = kind === "opening" ? OPENING_REASON : REASON_OPTIONS.some((r) => r.value === reasonParam) ? reasonParam : undefined;
  const sortParam = firstParam(query.sort);
  const sort: AdjustmentSort | undefined = ADJUSTMENT_SORTS.find((value) => value === sortParam);
  const direction: SortDirection = firstParam(query.dir) === "desc" ? "desc" : "asc";
  const { basePath } = kinds[kind];

  const [session, options, result] = await Promise.all([
    requireSession(),
    getInventoryOptions(),
    tryApi(() =>
      inventoryApi.adjustments.list({
        search,
        status,
        warehouseId,
        reason,
        excludeOpening: kind === "adjustment" ? true : undefined,
        from,
        to,
        sort,
        direction,
        limit: ADJUSTMENT_PAGE_SIZE,
        offset,
      }),
    ),
  ]);
  const filtered = Boolean(search || status || warehouseId || from || to || (kind === "adjustment" && reason));
  const warehouses = options.ok ? options.data.warehouses : [];
  const canManage = canManageInventory(session);
  const filterQuery = {
    q: search,
    status,
    warehouse: warehouseId === undefined ? undefined : String(warehouseId),
    reason: kind === "adjustment" ? reason : undefined,
    from,
    to,
  };
  const sorting = { sort: sort ?? "", direction, basePath, query: filterQuery };
  const header = (text: string, column: AdjustmentSort, className?: string) => (
    <SortHeader label={text} column={column} className={className} {...sorting} />
  );
  const noun = kind === "opening" ? "opening stock" : "adjustment";

  return (
    <>
      {/* A slim header row: the count and the filters, which apply as you type or choose. */}
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-3 xl:flex-row xl:items-center xl:justify-between dark:border-gray-800">
        <h2 className="text-sm font-semibold whitespace-nowrap text-gray-800 dark:text-white/90">
          {result.ok
            ? `${formatNumber(result.data.totalCount)} ${kind === "opening" ? "document" : "adjustment"}${result.data.totalCount === 1 ? "" : "s"}`
            : kinds[kind].title}
        </h2>
        <AutoSearchToolbar
          basePath={basePath}
          search={search}
          placeholder="Number or remarks"
          filters={[
            ...(warehouses.length > 1
              ? [
                  {
                    name: "warehouse",
                    label: "Warehouse",
                    value: filterQuery.warehouse,
                    options: warehouseFilterOptions(warehouses),
                    allLabel: "All warehouses",
                    className: "w-44",
                    searchable: true,
                  },
                ]
              : []),
            ...(kind === "adjustment"
              ? [{ name: "reason", label: "Reason", value: reason, options: REASON_OPTIONS, allLabel: "All reasons", className: "w-40" }]
              : []),
            { name: "status", label: "Status", value: status, options: STATUS_OPTIONS, allLabel: "All statuses", className: "w-32" },
          ]}
          dateRange={{ from, to }}
        />
      </div>
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 && offset === 0 ? (
        <EmptyState
          icon={kind === "opening" ? PackagePlus : ClipboardList}
          title={filtered ? "Nothing matches these filters" : kind === "opening" ? "No opening stock yet" : "No adjustments yet"}
          description={
            filtered
              ? undefined
              : kind === "opening"
                ? "Enter the stock you have when you start using the system with New opening stock."
                : "Write off damaged, expired or lost stock, or add stock that was found, with New adjustment."
          }
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                {header("Number", "number")}
                {header("Date", "date")}
                {header("Warehouse", "warehouse")}
                {kind === "adjustment" && header("Reason", "reason")}
                {header("Lines", "lines", "text-right")}
                {header("Value", "value", "text-right")}
                {header("Status", "status")}
                {canManage && <TH className="text-right">Actions</TH>}
              </tr>
            </THead>
            <TBody>
              {result.data.items.map((item) => (
                <TR key={item.id}>
                  <TD>
                    <Link href={`${basePath}/${item.id}`} className="font-medium text-brand-500 hover:underline">
                      {item.adjustmentNo}
                    </Link>
                    {item.remarks && <span className="block max-w-64 truncate text-xs text-gray-500">{item.remarks}</span>}
                  </TD>
                  <TD className="whitespace-nowrap">{formatDate(item.adjustmentDate)}</TD>
                  <TD>{item.warehouseName}</TD>
                  {kind === "adjustment" && (
                    <TD>
                      {label(item.reason)}
                      {item.stockCountNo && <span className="block text-xs text-gray-500">count {item.stockCountNo}</span>}
                    </TD>
                  )}
                  <TD className="text-right tabular-nums">{formatNumber(item.lineCount)}</TD>
                  <TD className="text-right tabular-nums">{formatAmount(item.totalValue)}</TD>
                  <TD>
                    <DocumentStatusBadge status={item.status} />
                  </TD>
                  {canManage && (
                    <TD className="text-right">
                      {/* Only a draft can be changed or deleted; a posted one is cancelled from its page. */}
                      {item.status !== "Draft" ? (
                        <LockedRowActions
                          reason={
                            item.status === "Posted"
                              ? `A posted ${noun} can't be edited or deleted: its stock is on the books. Open it to cancel it.`
                              : `A cancelled ${noun} can't be edited or deleted.`
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Link
                            href={`${basePath}/${item.id}/edit`}
                            className={rowIconAction("edit")}
                            title={`Edit ${item.adjustmentNo}`}
                            aria-label={`Edit ${item.adjustmentNo}`}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                          <ConfirmDeleteButton
                            iconOnly
                            action={(kind === "opening" ? deleteOpeningStockFromListAction : deleteAdjustmentFromListAction).bind(null, item.id)}
                            itemLabel={`draft ${noun} ${item.adjustmentNo}`}
                          />
                        </span>
                      )}
                    </TD>
                  )}
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            basePath={basePath}
            query={{ ...filterQuery, sort, dir: direction === "asc" ? undefined : direction }}
            offset={offset}
            limit={ADJUSTMENT_PAGE_SIZE}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}

// ---- View

export async function AdjustmentDetail({ kind, params }: { kind: AdjustmentKind; params: Promise<{ adjustmentId: string }> }) {
  const id = parseIdParam((await params).adjustmentId);
  if (id === null) notFound();
  const [session, result] = await Promise.all([requireSession(), tryApi(() => inventoryApi.adjustments.get(id))]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  const adjustment = result.data;
  // Opening stock lives under its own list; keep the URL and the crumbs right.
  if (kindOf(adjustment) !== kind) redirect(`${adjustmentBasePath(kindOf(adjustment))}/${id}`);

  const { basePath, title, noun } = kinds[kind];
  const canManage = canManageInventory(session);
  const isDraft = adjustment.status === "Draft";
  const isPosted = adjustment.status === "Posted";

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-3">
            {adjustment.adjustmentNo} <DocumentStatusBadge status={adjustment.status} />
          </span>
        }
        description={`${kind === "opening" ? "Opening stock" : label(adjustment.reason)} · ${adjustment.warehouseName} · ${formatDate(adjustment.adjustmentDate)}`}
        breadcrumbs={inventoryCrumbs({ label: title, href: basePath }, { label: adjustment.adjustmentNo })}
        actions={
          canManage && (
            <div className="flex flex-wrap items-start gap-2">
              {isDraft && (
                <>
                  <LinkButton href={`${basePath}/${id}/edit`} variant="outline" size="sm">
                    <Pencil className="size-4" aria-hidden /> Edit
                  </LinkButton>
                  <DocumentActionButton
                    action={postAdjustmentAction.bind(null, id)}
                    variant="primary"
                    confirmMessage={
                      kind === "opening"
                        ? "Post this opening stock? The stock goes on the books at these costs. A posted document can't be edited."
                        : "Post this adjustment? The stock is added or removed now. A posted document can't be edited."
                    }
                  >
                    Post
                  </DocumentActionButton>
                  <DocumentActionButton
                    action={(kind === "opening" ? deleteOpeningStockAction : deleteAdjustmentAction).bind(null, id)}
                    variant="danger"
                    confirmMessage={`Delete this draft ${noun}?`}
                  >
                    Delete
                  </DocumentActionButton>
                </>
              )}
              {isPosted && (
                <DocumentActionButton
                  action={cancelAdjustmentAction.bind(null, id)}
                  variant="danger"
                  confirmMessage={`Cancel this ${noun}? Its stock change is reversed.`}
                >
                  Cancel {noun}
                </DocumentActionButton>
              )}
            </div>
          )
        }
      />

      <div className="space-y-6">
        <Card>
          <CardBody>
            <Facts
              items={[
                { label: "Warehouse", value: adjustment.warehouseName },
                { label: "Date", value: formatDate(adjustment.adjustmentDate) },
                { label: "Reason", value: kind === "adjustment" ? label(adjustment.reason) : null },
                {
                  label: "From stock count",
                  value: adjustment.stockCountId ? (
                    <Link href={`/inventory/counts/${adjustment.stockCountId}`} className="text-brand-500 hover:underline">
                      {adjustment.stockCountNo ?? `Count #${adjustment.stockCountId}`}
                    </Link>
                  ) : null,
                },
                { label: "Posted", value: adjustment.postedAt ? formatDateTime(adjustment.postedAt) : null },
                { label: "Remarks", value: adjustment.remarks },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title={`Items (${adjustment.lines.length})`}
            description={
              kind === "adjustment" && isDraft && adjustment.lines.some((l) => l.quantity < 0)
                ? "Removals are valued at the average cost when posted."
                : undefined
            }
          />
          <StockLinesTable lines={adjustment.lines} mode={kind} />
          <CardBody>
            <TotalsList rows={[{ label: kind === "opening" ? "Stock value" : "Value", value: formatAmount(adjustment.totalValue), strong: true }]} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

// ---- New / edit

/** On its page, or (with `returnTo`, the list) in the popup over the list, which saving returns to. */
export async function NewAdjustment({ kind, returnTo }: { kind: AdjustmentKind; returnTo?: string }) {
  const [session, options] = await Promise.all([requireSession(), loadStockEditorOptions()]);
  if (!options.ok)
    return (
      <Card>
        <ApiErrorState error={options.error} />
      </Card>
    );
  return (
    <StockDocumentEditor
      mode={kind}
      action={(kind === "opening" ? saveOpeningStockAction : saveAdjustmentAction).bind(null, null)}
      options={options.data}
      canPost={canManageInventory(session)}
      cancelHref={adjustmentBasePath(kind)}
      returnTo={returnTo}
    />
  );
}

/** A new stock transfer, on its page or (with `returnTo`) in the popup over the transfers list. */
export async function NewTransfer({ returnTo }: { returnTo?: string }) {
  const [session, options] = await Promise.all([requireSession(), loadStockEditorOptions()]);
  if (!options.ok)
    return (
      <Card>
        <ApiErrorState error={options.error} />
      </Card>
    );
  return (
    <StockDocumentEditor
      mode="transfer"
      action={saveTransferAction.bind(null, null)}
      options={options.data}
      canPost={canManageInventory(session)}
      cancelHref="/inventory/transfers"
      returnTo={returnTo}
    />
  );
}

export async function EditAdjustment({
  kind,
  params,
  searchParams,
}: {
  kind: AdjustmentKind;
  params: Promise<{ adjustmentId: string }>;
  searchParams: Promise<ListSearchParams>;
}) {
  const id = parseIdParam((await params).adjustmentId);
  if (id === null) notFound();
  const notice = firstParam((await searchParams).notice);
  const [session, result, options] = await Promise.all([
    requireSession(),
    tryApi(() => inventoryApi.adjustments.get(id)),
    loadStockEditorOptions(),
  ]);
  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Card>
        <ApiErrorState error={result.error} />
      </Card>
    );
  }
  const adjustment = result.data;
  const actualKind = kindOf(adjustment);
  if (actualKind !== kind || adjustment.status !== "Draft") redirect(`${adjustmentBasePath(actualKind)}/${id}`);
  if (!options.ok)
    return (
      <Card>
        <ApiErrorState error={options.error} />
      </Card>
    );
  const products = await loadLineProducts(adjustment.lines);
  if (!products.ok)
    return (
      <Card>
        <ApiErrorState error={products.error} />
      </Card>
    );

  const { basePath, title } = kinds[kind];
  return (
    <>
      <PageHeader
        title={`Edit ${adjustment.adjustmentNo}`}
        description={kind === "opening" ? "A draft: the stock isn't on the books until you post it." : "A draft: nothing has moved yet. Post it to change the stock."}
        breadcrumbs={inventoryCrumbs(
          { label: title, href: basePath },
          { label: adjustment.adjustmentNo, href: `${basePath}/${id}` },
          { label: "Edit" },
        )}
      />
      {notice && (
        <Alert tone="error" className="mb-6">
          {notice}
        </Alert>
      )}
      <StockDocumentEditor
        mode={kind}
        action={(kind === "opening" ? saveOpeningStockAction : saveAdjustmentAction).bind(null, id)}
        options={options.data}
        canPost={canManageInventory(session)}
        cancelHref={`${basePath}/${id}`}
        initial={{
          date: adjustment.adjustmentDate,
          warehouseId: adjustment.warehouseId,
          reason: adjustment.reason,
          remarks: adjustment.remarks ?? "",
          lines: adjustment.lines,
          products: products.data,
        }}
      />
    </>
  );
}
