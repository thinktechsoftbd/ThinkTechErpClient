import { FieldError, SubmitButton } from "@/core/forms/action-form";
import { Checkbox, Field, Input } from "@/core/forms/fields";
import { LinkButton } from "@/core/ui/button";
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH, SECURITY_MANAGE_PERMISSION, type RoleSummary, type SecurityPermission } from "../types";

const groupBox = "rounded-xl border border-gray-200 p-4 dark:border-gray-800";
const legendClass = "mb-3 text-sm font-medium text-gray-700 dark:text-gray-400";
const emptyText = "text-sm text-gray-500 dark:text-gray-400";

/** Permissions as checkboxes, grouped by the module part of their code (PATIENT.V → PATIENT). */
export function PermissionPicker({
  permissions,
  selected,
  legend = "Permissions",
}: {
  permissions: SecurityPermission[];
  selected: readonly number[];
  legend?: string;
}) {
  const checked = new Set(selected);
  const groups = new Map<string, SecurityPermission[]>();
  for (const permission of [...permissions].sort((a, b) => a.code.localeCompare(b.code))) {
    const group = permission.code.split(".")[0];
    groups.set(group, [...(groups.get(group) ?? []), permission]);
  }

  return (
    <fieldset>
      <legend className={legendClass}>{legend}</legend>
      {groups.size === 0 ? (
        <p className={emptyText}>No permissions defined yet. Create them under Security → Permissions.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[...groups].map(([group, items]) => (
            <div key={group} className={groupBox}>
              <p className="mb-3 font-mono text-xs font-semibold text-gray-800 dark:text-white/90">{group}</p>
              <div className="space-y-2">
                {items.map((permission) => (
                  <Checkbox
                    key={permission.id}
                    name="permissionIds"
                    value={permission.id}
                    defaultChecked={checked.has(permission.id)}
                    className="flex"
                    label={
                      <span>
                        {permission.name} <code className="text-xs text-gray-400">{permission.code}</code>
                      </span>
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <FieldError name="permissionIds" />
    </fieldset>
  );
}

export function RolePicker({ roles, selected }: { roles: RoleSummary[]; selected: readonly number[] }) {
  const checked = new Set(selected);
  return (
    <fieldset>
      <legend className={legendClass}>Roles</legend>
      {roles.length === 0 ? (
        <p className={emptyText}>No roles defined yet. Create them under Security → Roles.</p>
      ) : (
        <div className={`grid grid-cols-1 gap-2 sm:grid-cols-2 ${groupBox}`}>
          {[...roles]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((role) => (
              <Checkbox key={role.id} name="roleIds" value={role.id} defaultChecked={checked.has(role.id)} label={role.name} />
            ))}
        </div>
      )}
      <FieldError name="roleIds" />
    </fieldset>
  );
}

export function PasswordFields({ label = "Password" }: { label?: string }) {
  return (
    <>
      <Field
        label={label}
        name="password"
        required
        hint={`${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_BYTES} characters (multi-byte characters count more).`}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </Field>
      <Field label="Confirm password" name="confirmPassword" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
    </>
  );
}

/** Submit and cancel buttons, or a note when the user may only view. */
export function FormActions({
  readOnly,
  submitLabel,
  cancelHref,
  className,
  managePermission = SECURITY_MANAGE_PERMISSION,
}: {
  readOnly?: boolean;
  submitLabel: string;
  cancelHref?: string;
  className?: string;
  /** Permission code named in the view-only note. */
  managePermission?: string;
}) {
  if (readOnly) {
    return (
      <p className={`${emptyText} ${className ?? ""}`}>
        View only: changing this needs the <code className="font-mono text-xs">{managePermission}</code> permission.
      </p>
    );
  }
  return (
    <div className={`flex gap-3 ${className ?? ""}`}>
      <SubmitButton>{submitLabel}</SubmitButton>
      {cancelHref && (
        <LinkButton href={cancelHref} variant="outline">
          Cancel
        </LinkButton>
      )}
    </div>
  );
}
