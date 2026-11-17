"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Checkbox, Field, Select, Textarea } from "@/core/forms/fields";
import { buttonClasses } from "@/core/ui/button";
import {
  DEPLOYMENT_DESCRIPTION_MAX_LENGTH,
  DEPLOYMENT_MAX_DESCRIPTIONS,
  DEPLOYMENT_REMARKS_MAX_LENGTH,
  type DeploymentInfo,
  type DeploymentServiceType,
} from "../../deployment-types";

/**
 * Fields of the add/edit deployment modal. The detail lines post as repeated "description" fields in their
 * order on screen; empty ones are ignored.
 */
export function DeploymentFields({ value, serviceTypes }: { value?: DeploymentInfo; serviceTypes: DeploymentServiceType[] }) {
  const [lines, setLines] = useState(() =>
    (value?.details.length ? value.details.map((detail) => detail.description) : [""]).map((text, index) => ({
      key: index + 1,
      text,
    })),
  );
  // Keys of added lines start after the starting ones', so a removed line never takes another's text.
  const nextKey = useRef(lines.length + 1);
  const choices = serviceTypes.filter((type) => type.isActive || type.id === value?.serviceTypeId);

  return (
    <>
      <Field label="Service type" name="serviceTypeId" required hint="From the Service Type list under Settings → Lookup Data.">
        <Select id="serviceTypeId" name="serviceTypeId" defaultValue={value?.serviceTypeId ?? ""} required>
          <option value="">Choose the service type…</option>
          {choices.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
              {type.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Deployment details"
        name="details"
        hint="One item per box, e.g. the URL, server, database, version or a note. Empty boxes are ignored."
      >
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={line.key} className="flex items-start gap-2">
              <Textarea
                name="description"
                rows={2}
                maxLength={DEPLOYMENT_DESCRIPTION_MAX_LENGTH}
                defaultValue={line.text}
                aria-label={`Detail ${index + 1}`}
                placeholder={index === 0 ? "e.g. https://admin.example.com" : undefined}
              />
              <button
                type="button"
                onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                disabled={lines.length <= 1}
                className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-500/10"
                aria-label={`Remove detail ${index + 1}`}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              const key = nextKey.current++;
              setLines((current) => [...current, { key, text: "" }]);
            }}
            disabled={lines.length >= DEPLOYMENT_MAX_DESCRIPTIONS}
            className={buttonClasses("outline", "sm")}
          >
            <Plus className="size-4" aria-hidden /> Add detail
          </button>
        </div>
      </Field>

      <Field label="Remarks" name="remarks">
        <Textarea id="remarks" name="remarks" rows={2} maxLength={DEPLOYMENT_REMARKS_MAX_LENGTH} defaultValue={value?.remarks ?? ""} />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (still deployed and in use)" />
    </>
  );
}
