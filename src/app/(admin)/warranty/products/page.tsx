import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";
import { Suspense } from "react";
import { tryApi } from "@/core/api/client";
import { requireSession } from "@/core/auth/session";
import { FilterSelect, ListToolbar } from "@/core/crud/list-toolbar";
import { ApiErrorState } from "@/core/ui/api-error-state";
import { Card, CardHeader } from "@/core/ui/card";
import { EmptyState, TableSkeleton } from "@/core/ui/feedback";
import { PageHeader } from "@/core/ui/page-header";
import { Pagination, firstParam, parseOffset } from "@/core/ui/pagination";
import { formatNumber } from "@/core/utils/format";
import { parseIdParam } from "@/core/utils/params";
import { canManageWarranty } from "@/modules/warranty/access";
import { warrantyApi } from "@/modules/warranty/api";
import { ProductWarrantyTable } from "@/modules/warranty/components/product-warranty-table";
import { getPolicyOptions } from "@/modules/warranty/queries";

export const metadata: Metadata = { title: "Product Warranty" };

const basePath = "/warranty/products";
type Props = PageProps<"/warranty/products">;

const COVERED_OPTIONS = [
  { value: "true", label: "With warranty" },
  { value: "false", label: "Without warranty" },
];

export default function ProductWarrantyPage({ searchParams }: Props) {
  return (
    <>
      <PageHeader
        title="Product Warranty"
        description="Which warranty each product is sold with. Posting a sale issues a warranty card per unit of these products."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Warranty", href: "/warranty/service" }, { label: "Product Warranty" }]}
      />
      <Card>
        <Suspense fallback={<TableSkeleton columns={5} />}>
          <ProductList searchParams={searchParams} />
        </Suspense>
      </Card>
    </>
  );
}

async function ProductList({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const search = firstParam(query.q);
  const policyParam = firstParam(query.policy);
  const policyId = policyParam ? (parseIdParam(policyParam) ?? undefined) : undefined;
  const coveredParam = firstParam(query.covered);
  const hasPolicy = coveredParam === "true" ? true : coveredParam === "false" ? false : undefined;
  const offset = parseOffset(query.offset);

  const [session, result, policies] = await Promise.all([
    requireSession(),
    tryApi(() => warrantyApi.products.list({ search, warrantyPolicyId: policyId, hasPolicy, limit: 50, offset })),
    getPolicyOptions(),
  ]);
  const policyList = policies.ok ? policies.data : [];
  const filtered = Boolean(search) || policyId !== undefined || hasPolicy !== undefined;

  return (
    <>
      <CardHeader
        title={result.ok ? `${formatNumber(result.data.totalCount)} product(s)` : "Products"}
        actions={
          <ListToolbar basePath={basePath} search={search} placeholder="Product, code, brand, category" filtered={filtered}>
            <FilterSelect
              name="policy"
              label="Policy"
              value={policyParam}
              options={policyList.map((p) => ({ value: String(p.id), label: p.name }))}
              allLabel="All policies"
              className="w-48"
            />
            <FilterSelect name="covered" label="Warranty" value={coveredParam} options={COVERED_OPTIONS} allLabel="With or without" className="w-44" />
          </ListToolbar>
        }
      />
      {!result.ok ? (
        <ApiErrorState error={result.error} />
      ) : result.data.items.length === 0 ? (
        <EmptyState icon={PackageCheck} title={filtered ? "No products match these filters" : "No products yet"} />
      ) : (
        <>
          {policyList.length === 0 && (
            <p className="px-5 pt-4 text-sm text-amber-700 dark:text-amber-400">Add a warranty policy first (Warranty → Settings → Warranty Policies).</p>
          )}
          <ProductWarrantyTable rows={result.data.items} policies={policyList} canManage={canManageWarranty(session)} />
          <Pagination
            basePath={basePath}
            query={{ q: search, policy: policyParam, covered: coveredParam }}
            offset={offset}
            limit={50}
            count={result.data.items.length}
            total={result.data.totalCount}
          />
        </>
      )}
    </>
  );
}
