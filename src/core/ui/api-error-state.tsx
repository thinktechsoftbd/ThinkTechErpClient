import { CloudOff, Lock, SearchX, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import type { ApiErrorInfo } from "@/core/api/errors";
import { EmptyState } from "./feedback";

/** Friendly rendering of a failed API read, for use inside a Card. */
export function ApiErrorState({ error, notFoundHint }: { error: ApiErrorInfo; notFoundHint?: ReactNode }) {
  if (error.status === 0) {
    return <EmptyState icon={CloudOff} title="API unavailable" description={error.message} />;
  }
  if (error.status === 403) {
    return <EmptyState icon={Lock} title="Access denied" description={error.message} />;
  }
  if (error.status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="Not found"
        description={
          notFoundHint ?? (
            <>
              The API returned 404 for <code className="font-mono text-xs">{error.path}</code>.
            </>
          )
        }
      />
    );
  }
  return (
    <EmptyState
      icon={TriangleAlert}
      title={`Request failed${error.status ? ` (${error.status})` : ""}`}
      description={error.message}
    />
  );
}
