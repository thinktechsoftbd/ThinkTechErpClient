"use client";

import { TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String(error.digest) : undefined;
  const message =
    process.env.NODE_ENV === "development" && error instanceof Error
      ? error.message
      : `An unexpected error occurred${digest ? ` (reference ${digest})` : ""}.`;

  return (
    <Card>
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description={message}
        action={<Button onClick={() => retry()}>Try again</Button>}
      />
    </Card>
  );
}
