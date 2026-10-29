"use client";

import { useState } from "react";
import { Input } from "@/core/forms/fields";
import { CopyButton } from "@/core/ui/copy-button";

/** The editable Organization Id (object_id) with a copy button for the current value. */
export function OrganizationIdField({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <div className="flex items-center gap-2">
      <Input
        id="objectId"
        name="objectId"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Generated automatically when left empty"
        maxLength={36}
        autoComplete="off"
        spellCheck={false}
        className="font-mono"
      />
      <CopyButton value={value.trim()} className="h-11 px-3" />
    </div>
  );
}
