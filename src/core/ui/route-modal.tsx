"use client";

import { useRouter } from "next/navigation";
import { Fragment, type ReactNode } from "react";
import { Dialog } from "./dialog";

/**
 * The dialog for an intercepted route (an `@modal/(.)…` page): open while the route is, closed with
 * Back so the page underneath comes back as it was. A refresh or shared link opens the full page instead.
 *
 * Next.js keeps the closed route hidden rather than unmounting it, so the content is keyed on
 * `bfcacheId`: each click that opens the popup gets a fresh form, while browser Back/Forward restores it.
 */
export function RouteModal({
  title,
  description,
  size = "xl",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  size?: "md" | "xl";
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <Dialog open onClose={() => router.back()} title={title} description={description} size={size}>
      <Fragment key={router.bfcacheId}>{children}</Fragment>
    </Dialog>
  );
}
