import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmActionButton } from "@/core/forms/confirm-action-button";
import { Badge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime } from "@/core/utils/format";
import { deleteWebsiteRecordAction } from "../actions";
import { columnLabel, isIsoDate, recordId } from "../records";
import type { WebsiteTableDefinition } from "../tables";
import type { WebsiteRecord } from "../types";

function Cell({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-gray-400">—</span>;
  if (typeof value === "boolean") return <Badge tone={value ? "success" : "gray"}>{value ? "Yes" : "No"}</Badge>;
  if (isIsoDate(value)) return <span className="whitespace-nowrap">{formatDateTime(value)}</span>;
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return (
    <span className="block max-w-72 truncate" title={text.length > 60 ? text : undefined}>
      {text}
    </span>
  );
}

export function RecordsTable({
  definition,
  records,
  columns,
}: {
  definition: WebsiteTableDefinition;
  records: WebsiteRecord[];
  columns: string[];
}) {
  const basePath = `/website/${definition.table}`;
  return (
    <Table>
      <THead>
        <tr>
          <TH>ID</TH>
          {columns.map((column) => (
            <TH key={column}>{columnLabel(column)}</TH>
          ))}
          <TH className="text-right">Actions</TH>
        </tr>
      </THead>
      <TBody>
        {records.map((record, index) => {
          const id = recordId(record);
          return (
            <TR key={id ?? index}>
              <TD className="font-mono text-xs text-gray-500 dark:text-gray-400">
                <span className="block max-w-28 truncate" title={id}>
                  {id ?? "—"}
                </span>
              </TD>
              {columns.map((column) => (
                <TD key={column}>
                  <Cell value={record[column]} />
                </TD>
              ))}
              <TD className="text-right">
                {id && (
                  <span className="inline-flex items-center gap-1">
                    <Link
                      href={`${basePath}/${encodeURIComponent(id)}`}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      <Pencil className="size-4" aria-hidden /> Edit
                    </Link>
                    <ConfirmActionButton
                      action={deleteWebsiteRecordAction.bind(null, definition.table, id, undefined)}
                      confirmMessage={`Delete this ${definition.singular.toLowerCase()}? This cannot be undone.`}
                    >
                      <Trash2 className="size-4" aria-hidden /> Delete
                    </ConfirmActionButton>
                  </span>
                )}
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
