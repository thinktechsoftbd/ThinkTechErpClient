import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Textarea } from "@/core/forms/fields";
import { saveOrganizationAction, savePermissionAction, saveRoleAction } from "../actions";
import type { Organization, SecurityPermission, SecurityRole } from "../types";
import { FormActions, PermissionPicker } from "./form-parts";

const sectionTitle = "text-sm font-semibold text-gray-800 md:col-span-2 dark:text-white/90";

/** Text input bound to an organization field. */
function OrganizationInput({
  organization,
  name,
  label,
  maxLength,
  type = "text",
  required,
  className,
}: {
  organization?: Organization;
  name: keyof Organization;
  label: string;
  maxLength: number;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  const value = organization?.[name];
  return (
    <Field label={label} name={name} required={required} className={className}>
      <Input
        id={name}
        name={name}
        type={type}
        maxLength={maxLength}
        defaultValue={typeof value === "string" ? value : ""}
        required={required}
      />
    </Field>
  );
}

export function OrganizationForm({ organization, readOnly }: { organization?: Organization; readOnly?: boolean }) {
  const field = { organization };
  return (
    <ActionForm action={saveOrganizationAction.bind(null, organization?.id ?? null)}>
      <fieldset disabled={readOnly} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormMessage className="md:col-span-2" />
        <h4 className={sectionTitle}>Identity</h4>
        <OrganizationInput {...field} name="nameEn" label="Name (English)" maxLength={200} required />
        <OrganizationInput {...field} name="nameBn" label="Name (Bangla)" maxLength={200} />
        <OrganizationInput {...field} name="code" label="Code" maxLength={50} />
        <OrganizationInput {...field} name="slogan" label="Slogan" maxLength={500} />
        <OrganizationInput {...field} name="logoUrl" label="Logo URL" type="url" maxLength={500} className="md:col-span-2" />

        <h4 className={`${sectionTitle} pt-2`}>Contact</h4>
        <OrganizationInput {...field} name="email" label="Email" type="email" maxLength={150} />
        <OrganizationInput {...field} name="phone" label="Phone" type="tel" maxLength={50} />
        <OrganizationInput {...field} name="website" label="Website" type="url" maxLength={255} className="md:col-span-2" />

        <h4 className={`${sectionTitle} pt-2`}>Address</h4>
        <OrganizationInput {...field} name="addressLine1" label="Address line 1" maxLength={255} className="md:col-span-2" />
        <OrganizationInput {...field} name="addressLine2" label="Address line 2" maxLength={255} className="md:col-span-2" />
        <OrganizationInput {...field} name="city" label="City" maxLength={100} />
        <OrganizationInput {...field} name="state" label="State / division" maxLength={100} />
        <OrganizationInput {...field} name="postalCode" label="Postal code" maxLength={20} />
        <OrganizationInput {...field} name="country" label="Country" maxLength={100} />

        <Checkbox name="isActive" defaultChecked={organization?.isActive ?? true} label="Active" className="md:col-span-2" />
        <FormActions
          readOnly={readOnly}
          submitLabel={organization ? "Save organization" : "Create organization"}
          cancelHref={organization ? undefined : "/security/organizations"}
          className="md:col-span-2"
        />
      </fieldset>
    </ActionForm>
  );
}

export function PermissionForm({ permission, readOnly }: { permission?: SecurityPermission; readOnly?: boolean }) {
  return (
    <ActionForm action={savePermissionAction.bind(null, permission?.id ?? null)}>
      <fieldset disabled={readOnly} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormMessage className="md:col-span-2" />
        <Field label="Code" name="code" required hint="Uppercase MODULE.ACTION, e.g. PATIENT.V (view) or PATIENT.M (manage).">
          <Input
            id="code"
            name="code"
            maxLength={100}
            defaultValue={permission?.code}
            className="font-mono uppercase"
            autoComplete="off"
            required
          />
        </Field>
        <Field label="Name" name="name" required>
          <Input id="name" name="name" maxLength={200} defaultValue={permission?.name} required />
        </Field>
        <Field label="Description" name="description" className="md:col-span-2">
          <Textarea id="description" name="description" rows={3} maxLength={500} defaultValue={permission?.description ?? ""} />
        </Field>
        <FormActions
          readOnly={readOnly}
          submitLabel={permission ? "Save permission" : "Create permission"}
          cancelHref={permission ? undefined : "/security/permissions"}
          className="md:col-span-2"
        />
      </fieldset>
    </ActionForm>
  );
}

export function RoleForm({
  role,
  permissions,
  readOnly,
}: {
  role?: SecurityRole;
  permissions: SecurityPermission[];
  readOnly?: boolean;
}) {
  return (
    <ActionForm action={saveRoleAction.bind(null, role?.id ?? null)}>
      <fieldset disabled={readOnly} className="space-y-6">
        <FormMessage />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Role name" name="name" required>
            <Input id="name" name="name" maxLength={100} defaultValue={role?.name} required />
          </Field>
          <Field label="Description" name="description">
            <Textarea id="description" name="description" rows={1} maxLength={500} defaultValue={role?.description ?? ""} />
          </Field>
        </div>
        <PermissionPicker permissions={permissions} selected={role?.permissions.map((permission) => permission.id) ?? []} />
        <FormActions
          readOnly={readOnly}
          submitLabel={role ? "Save role" : "Create role"}
          cancelHref={role ? undefined : "/security/roles"}
        />
      </fieldset>
    </ActionForm>
  );
}
