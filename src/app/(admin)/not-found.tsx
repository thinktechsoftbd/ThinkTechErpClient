import { SearchX } from "lucide-react";
import { LinkButton } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { EmptyState } from "@/core/ui/feedback";

export default function AdminNotFound() {
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        title="Not found"
        description="The record or page you are looking for doesn't exist or has been removed."
        action={<LinkButton href="/dashboard" variant="outline">Back to dashboard</LinkButton>}
      />
    </Card>
  );
}
