import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Field, Input, Select } from "@/core/forms/fields";
import { Badge } from "@/core/ui/badge";
import { createUserAction, setPasswordAction, setUserPermissionsAction, updateUserAction } from "../actions";
import type { RoleSummary, SecurityPermission, SecurityUser, UserPermissionSet } from "../types";
import { FormActions, PasswordFields, PermissionPicker, RolePicker } from "./form-parts";

function ProfileFields({ user }: { user?: SecurityUser }) {
  return (
    <>
      <Field label="Name" name="name" required>
        <Input id="name" name="name" maxLength={200} defaultValue={user?.name} required />
      </Field>
      <Field label="Email" name="email" required hint="Used to sign in.">
        <Input id="email" name="email" type="email" maxLength={256} autoComplete="off" defaultValue={user?.email} required />
      </Field>
      <Field label="Photo URL" name="photoUrl">
        <Input id="photoUrl" name="photoUrl" type="url" maxLength={500} defaultValue={user?.photoUrl ?? ""} />
      </Field>
      <Field label="Status" name="status" hint="Inactive users cannot sign in.">
        <Select id="status" name="status" defaultValue={user?.status ?? "ACTIVE"}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </Field>
    </>
  );
}

export function UserCreateForm({ roles }: { roles: RoleSummary[] }) {
  return (
    <ActionForm action={createUserAction}>
      <fieldset className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormMessage className="md:col-span-2" />
        <ProfileFields />
        <PasswordFields />
        <div className="md:col-span-2">
          <RolePicker roles={roles} selected={[]} />
        </div>
        <FormActions submitLabel="Create user" cancelHref="/security/users" className="md:col-span-2" />
      </fieldset>
    </ActionForm>
  );
}

export function UserProfileForm({ user, roles, readOnly }: { user: SecurityUser; roles: RoleSummary[]; readOnly?: boolean }) {
  // Keep roles the list doesn't include (e.g. created meanwhile) selectable.
  const allRoles = [...roles, ...user.roles.filter((role) => !roles.some((known) => known.id === role.id))];
  return (
    <ActionForm action={updateUserAction.bind(null, user.id)}>
      <fieldset disabled={readOnly} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormMessage className="md:col-span-2" />
        <ProfileFields user={user} />
        <div className="md:col-span-2">
          <RolePicker roles={allRoles} selected={user.roles.map((role) => role.id)} />
        </div>
        <FormActions readOnly={readOnly} submitLabel="Save user" className="md:col-span-2" />
      </fieldset>
    </ActionForm>
  );
}

export function UserPasswordForm({ userId }: { userId: number }) {
  return (
    <ActionForm action={setPasswordAction.bind(null, userId)} className="space-y-5" resetOnSuccess>
      <FormMessage />
      <PasswordFields label="New password" />
      <SubmitButton variant="outline" pendingLabel="Changing…">
        Change password
      </SubmitButton>
    </ActionForm>
  );
}

export function UserPermissionsForm({
  userId,
  permissions,
  granted,
  readOnly,
}: {
  userId: number;
  permissions: SecurityPermission[];
  granted: UserPermissionSet;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">
          Effective permissions <span className="font-normal text-gray-500">(from roles plus direct grants)</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {granted.effective.length > 0 ? (
            [...granted.effective].sort().map((code) => (
              <Badge key={code} tone="brand">
                <span className="font-mono">{code}</span>
              </Badge>
            ))
          ) : (
            <Badge>None</Badge>
          )}
        </div>
      </div>
      <ActionForm action={setUserPermissionsAction.bind(null, userId)}>
        <fieldset disabled={readOnly} className="space-y-5">
          <FormMessage />
          <PermissionPicker
            legend="Direct permissions (in addition to the user's roles)"
            permissions={permissions}
            selected={granted.direct.map((permission) => permission.id)}
          />
          <FormActions readOnly={readOnly} submitLabel="Save direct permissions" />
        </fieldset>
      </ActionForm>
    </div>
  );
}
