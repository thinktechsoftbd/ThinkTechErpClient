"use client";

import { useState } from "react";
import { Checkbox, Field, Input } from "@/core/forms/fields";

/**
 * A write-only provider credential. It is never prefilled: when editing, an empty field keeps the
 * stored value, and "Remove" (which disables the field) clears it.
 */
export function SecretField({
  name,
  label,
  maxLength,
  editing,
  isSet,
}: {
  name: "apiPassword" | "apiKey";
  label: string;
  maxLength: number;
  editing: boolean;
  /** Whether the provider has one stored. */
  isSet: boolean;
}) {
  const [remove, setRemove] = useState(false);
  const canRemove = editing && isSet;

  return (
    <Field
      label={label}
      name={name}
      hint={editing ? (isSet ? "Leave empty to keep the current one." : "None stored yet.") : "Optional. It is stored and never shown again."}
    >
      <Input
        id={name}
        name={name}
        type="password"
        maxLength={maxLength}
        autoComplete="new-password"
        disabled={remove}
        placeholder={remove ? "Will be removed" : undefined}
      />
      {canRemove && (
        <Checkbox
          name={`${name}Remove`}
          checked={remove}
          onChange={(event) => setRemove(event.target.checked)}
          label="Remove"
          className="mt-2"
        />
      )}
    </Field>
  );
}
