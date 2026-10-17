import Link from "next/link";
import { Badge, StatusBadge } from "@/core/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/core/ui/table";
import { formatDateTime, formatMoney, formatNumber } from "@/core/utils/format";
import type { SmsAdnPurchase, SmsBalanceTransaction, SmsClient, SmsClientAllocation, SmsUsageRecord } from "../types";

function ClientLink({ clientId }: { clientId: string | null }) {
  if (!clientId) return <span className="text-gray-400">—</span>;
  return (
    <Link href={`/sms/clients/${encodeURIComponent(clientId)}`} className="font-medium text-brand-500 hover:underline">
      {clientId}
    </Link>
  );
}

function Delta({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400">0</span>;
  return (
    <span className={value > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
      {value > 0 ? "+" : ""}
      {formatNumber(value)}
    </span>
  );
}

function transactionTone(type: string) {
  const value = type.toLowerCase();
  if (value.includes("purchase")) return "brand" as const;
  if (value.includes("alloc")) return "warning" as const;
  if (value.includes("usage") || value.includes("consum")) return "success" as const;
  return "gray" as const;
}

const muted = "text-gray-500 dark:text-gray-400";

export function ClientsTable({ clients }: { clients: SmsClient[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Client</TH>
          <TH>Status</TH>
          <TH className="text-right">Available</TH>
          <TH className="text-right">Allocated</TH>
          <TH className="text-right">Consumed</TH>
          <TH>Created</TH>
        </tr>
      </THead>
      <TBody>
        {clients.map((client) => (
          <TR key={client.clientId}>
            <TD>
              <ClientLink clientId={client.clientId} />
              <p className={`text-xs ${muted}`}>{client.displayName}</p>
            </TD>
            <TD>
              <StatusBadge active={client.isActive} />
            </TD>
            <TD className="text-right font-medium">{formatNumber(client.availableSms)}</TD>
            <TD className="text-right">{formatNumber(client.totalAllocatedSms)}</TD>
            <TD className="text-right">{formatNumber(client.totalConsumedSms)}</TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(client.createdAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function TransactionsTable({ transactions, showClient = true }: { transactions: SmsBalanceTransaction[]; showClient?: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          <TH>Type</TH>
          {showClient && <TH>Client</TH>}
          <TH className="text-right">Quantity</TH>
          <TH className="text-right">Platform Δ</TH>
          <TH className="text-right">Client Δ</TH>
          <TH className="text-right">Platform after</TH>
          <TH className="text-right">Client after</TH>
          <TH>Reference / note</TH>
          <TH>Date</TH>
        </tr>
      </THead>
      <TBody>
        {transactions.map((transaction) => (
          <TR key={transaction.transactionId}>
            <TD className={muted}>{transaction.transactionId}</TD>
            <TD>
              <Badge tone={transactionTone(transaction.transactionType)}>{transaction.transactionType}</Badge>
            </TD>
            {showClient && (
              <TD>
                <ClientLink clientId={transaction.clientId} />
              </TD>
            )}
            <TD className="text-right font-medium">{formatNumber(transaction.quantity)}</TD>
            <TD className="text-right">
              <Delta value={transaction.platformDelta} />
            </TD>
            <TD className="text-right">
              <Delta value={transaction.clientDelta} />
            </TD>
            <TD className="text-right">{formatNumber(transaction.platformBalanceAfter)}</TD>
            <TD className="text-right">{formatNumber(transaction.clientBalanceAfter)}</TD>
            <TD className={`max-w-64 truncate ${muted}`} title={transaction.note ?? undefined}>
              {transaction.providerReference ?? transaction.requestReference ?? transaction.note ?? "—"}
            </TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(transaction.createdAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function AllocationsTable({ allocations, showClient = true }: { allocations: SmsClientAllocation[]; showClient?: boolean }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          {showClient && <TH>Client</TH>}
          <TH className="text-right">Quantity</TH>
          <TH>Note</TH>
          <TH>Transaction</TH>
          <TH>Allocated</TH>
        </tr>
      </THead>
      <TBody>
        {allocations.map((allocation) => (
          <TR key={allocation.allocationId}>
            <TD className={muted}>{allocation.allocationId}</TD>
            {showClient && (
              <TD>
                <ClientLink clientId={allocation.clientId} />
              </TD>
            )}
            <TD className="text-right font-medium">{formatNumber(allocation.smsQuantity)}</TD>
            <TD className={`max-w-80 truncate ${muted}`}>{allocation.note ?? "—"}</TD>
            <TD className={muted}>{allocation.transactionId}</TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(allocation.allocatedAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function PurchasesTable({ purchases }: { purchases: SmsAdnPurchase[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          <TH>Provider</TH>
          <TH>Reference</TH>
          <TH className="text-right">Quantity</TH>
          <TH className="text-right">Amount</TH>
          <TH>Note</TH>
          <TH>Purchased</TH>
        </tr>
      </THead>
      <TBody>
        {purchases.map((purchase) => (
          <TR key={purchase.purchaseId}>
            <TD className={muted}>{purchase.purchaseId}</TD>
            <TD>{purchase.provider}</TD>
            <TD className={muted}>{purchase.providerReference ?? "—"}</TD>
            <TD className="text-right font-medium">{formatNumber(purchase.smsQuantity)}</TD>
            <TD className="text-right">{formatMoney(purchase.amountPaid, purchase.currency)}</TD>
            <TD className={`max-w-64 truncate ${muted}`}>{purchase.note ?? "—"}</TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(purchase.purchasedAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function UsageTable({ usage }: { usage: SmsUsageRecord[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>#</TH>
          <TH>Request reference</TH>
          <TH>Recipient</TH>
          <TH>Provider message</TH>
          <TH className="text-right">Quantity</TH>
          <TH>Sent</TH>
        </tr>
      </THead>
      <TBody>
        {usage.map((record) => (
          <TR key={record.usageId}>
            <TD className={muted}>{record.usageId}</TD>
            <TD className="font-mono text-xs">{record.requestReference}</TD>
            <TD>{record.recipient ?? "—"}</TD>
            <TD className={`font-mono text-xs ${muted}`}>{record.providerMessageId ?? "—"}</TD>
            <TD className="text-right font-medium">{formatNumber(record.smsQuantity)}</TD>
            <TD className={`whitespace-nowrap ${muted}`}>{formatDateTime(record.sentAt)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
