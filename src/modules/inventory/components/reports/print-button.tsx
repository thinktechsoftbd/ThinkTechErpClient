"use client";

import { Printer } from "lucide-react";
import { Button } from "@/core/ui/button";

/** Prints the current report (the filters, buttons and pagination hide themselves when printing). */
export function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" aria-hidden /> {label}
    </Button>
  );
}
