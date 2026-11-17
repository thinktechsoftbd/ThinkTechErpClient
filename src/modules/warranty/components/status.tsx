import { Badge } from "@/core/ui/badge";
import { warrantyLabel, type Coverage } from "../types";

type Tone = "gray" | "brand" | "success" | "warning" | "error";

const jobTones: Record<string, Tone> = {
  Received: "gray",
  Diagnosing: "brand",
  AwaitingApproval: "warning",
  InRepair: "brand",
  WaitingForParts: "warning",
  AtSupplier: "warning",
  Ready: "success",
  Delivered: "gray",
  Cancelled: "error",
};

/** Where a service job stands (Received ... Ready, Delivered, Cancelled). */
export function JobStatusBadge({ status }: { status: string }) {
  return <Badge tone={jobTones[status] ?? "gray"}>{warrantyLabel(status)}</Badge>;
}

const coverageTones: Record<Coverage, Tone> = {
  InReplacement: "success",
  InWarranty: "success",
  Expired: "warning",
  Replaced: "gray",
  Void: "error",
};

/** What a warranty card covers today. */
export function CoverageBadge({ coverage }: { coverage: Coverage | null | undefined }) {
  if (!coverage) return null;
  return <Badge tone={coverageTones[coverage] ?? "gray"}>{warrantyLabel(coverage)}</Badge>;
}

export function JobTypeBadge({ jobType }: { jobType: string }) {
  return <Badge tone={jobType === "Warranty" ? "brand" : "gray"}>{jobType === "Warranty" ? "Warranty" : "Paid"}</Badge>;
}

const claimTones: Record<string, Tone> = { Sent: "warning", Returned: "success", Cancelled: "error" };

export function ClaimStatusBadge({ status }: { status: string }) {
  return <Badge tone={claimTones[status] ?? "gray"}>{status === "Sent" ? "At supplier" : status}</Badge>;
}
