import { StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatNumber } from "@/core/utils/format";
import type { SmsOrganizationBalance, SmsProvider } from "../types";
import { SmsLeft } from "./sms-left";

const muted = "text-gray-500 dark:text-gray-400";

/** Each provider's stock: bought, allocated and left to allocate. */
export function ProviderStockTable({ providers }: { providers: SmsProvider[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Provider</TH>
          <TH>Code</TH>
          <TH>Status</TH>
          <TH className="text-right">Bought</TH>
          <TH className="text-right">Allocated</TH>
          <TH className="text-right">Left to allocate</TH>
        </tr>
      </THead>
      <TBody>
        {providers.map((provider) => (
          <TR key={provider.id}>
            <TD className="font-medium text-gray-800 dark:text-white/90">{provider.name}</TD>
            <TD className={`font-mono text-xs ${muted}`}>{provider.code}</TD>
            <TD>
              <StatusBadge active={provider.isActive} />
            </TD>
            <TD className="text-right tabular-nums">{formatNumber(provider.purchasedSms)}</TD>
            <TD className="text-right tabular-nums">{formatNumber(provider.allocatedSms)}</TD>
            <TD className="text-right font-medium tabular-nums text-gray-800 dark:text-white/90">{formatNumber(provider.availableSms)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

/** Organizations with the fewest SMS left. */
export function LowestBalancesTable({ rows }: { rows: SmsOrganizationBalance[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Organization</TH>
          <TH className="text-right">Allocated</TH>
          <TH className="text-right">Used</TH>
          <TH className="text-right">Left</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.objectId}>
            <TD>
              <span className="font-medium text-gray-800 dark:text-white/90">{row.name}</span>
              {row.code && <span className={`block text-xs ${muted}`}>{row.code}</span>}
            </TD>
            <TD className="text-right tabular-nums">{formatNumber(row.allocatedSms)}</TD>
            <TD className="text-right tabular-nums">{formatNumber(row.smsUsage)}</TD>
            <TD className="text-right whitespace-nowrap">
              <SmsLeft left={row.availableSms} allocated={row.allocatedSms} />
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
