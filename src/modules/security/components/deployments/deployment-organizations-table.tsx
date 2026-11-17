import Link from "next/link";
import { Server } from "lucide-react";
import { rowAction } from "@/core/crud/row-action";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatNumber } from "@/core/utils/format";
import { deploymentPath, type DeploymentOrganization } from "../../deployment-types";

const muted = "text-gray-500 dark:text-gray-400";

/** Organizations with how many deployments each has, linking to their deployment pages. */
export function DeploymentOrganizationsTable({ rows }: { rows: DeploymentOrganization[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Organization</TH>
          <TH>Slug</TH>
          <TH className="text-right">Deployments</TH>
          <TH>Last changed</TH>
          <TH>Status</TH>
          <TH className="text-right">Actions</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => {
          const href = deploymentPath(row);
          return (
            <TR key={row.objectId}>
              <TD>
                <Link href={href} className="font-medium text-brand-500 hover:underline">
                  {row.name}
                </Link>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  {row.code && <span className={`text-xs ${muted}`}>{row.code}</span>}
                  {row.isExternal && <Badge tone="warning">External</Badge>}
                </span>
              </TD>
              <TD className={row.slug ? "font-mono text-xs" : muted}>{row.slug ?? "—"}</TD>
              <TD className="text-right whitespace-nowrap tabular-nums">
                {row.deploymentCount === 0 ? (
                  <span className={muted}>None</span>
                ) : (
                  <>
                    {formatNumber(row.deploymentCount)}
                    {row.activeDeploymentCount !== row.deploymentCount && (
                      <span className={`block text-xs ${muted}`}>{formatNumber(row.activeDeploymentCount)} active</span>
                    )}
                  </>
                )}
              </TD>
              <TD className={`whitespace-nowrap ${muted}`}>{row.lastChangedDate ? formatDateTime(row.lastChangedDate) : "—"}</TD>
              <TD>
                <StatusBadge active={row.isActive} />
              </TD>
              <TD className="text-right">
                <Link href={href} className={rowAction("view")}>
                  <Server className="size-4" aria-hidden /> Deployment
                </Link>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
