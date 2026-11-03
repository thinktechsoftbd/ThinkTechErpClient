"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Dialog } from "./dialog";

/**
 * A dialog opened by a parameter in the address of the page under it (e.g. a list's `?view=3`): the page
 * renders it while the parameter is there, and closing it goes to `closeHref`, the same page without it.
 * It closes at once instead of waiting for that page to load.
 */
export function QueryModal({
  closeHref,
  title,
  description,
  size = "xl",
  children,
}: {
  closeHref: string;
  title: ReactNode;
  description?: ReactNode;
  size?: "md" | "xl";
  children: ReactNode;
}) {
  const router = useRouter();
  const [closed, setClosed] = useState(false);
  return (
    <Dialog
      open={!closed}
      onClose={() => {
        setClosed(true);
        router.replace(closeHref, { scroll: false });
      }}
      title={title}
      description={description}
      size={size}
    >
      {children}
    </Dialog>
  );
}
