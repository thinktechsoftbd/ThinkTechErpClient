import { ActionForm, FieldError, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Textarea } from "@/core/forms/fields";
import { LinkButton } from "@/core/ui/button";
import {
  createRoleAction,
  createUserAction,
  resetPasswordAction,
  updateRoleAction,
  updateUserAction,
} from "../actions";
import { permissionCatalog } from "../catalog";
import { MIN_PASSWORD_LENGTH, type SecurityRole, type SecurityUser } from "../types";

function RolePicker({ roleNames, selected }: { roleNames: string[]; selected: string[] }) {
  const all = [...new Set([...roleNames, ...selected])].sort();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-400">Roles</legend>
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-800">
        {all.map((role) => (
          <Checkbox key={role} name="roles" value={role} defaultChecked={selected.includes(role)} label={role} />
        ))}
      </div>
      <FieldError name="roles" />
    </fieldset>
  );
}

function PasswordFields() {
  return (
    <>
      <Field label="Password" name="password" required hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
      </Field>
      <Field label="Confirm password" name="confirmPassword" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
    </>
  );
}

export function UserCreateForm({ roleNames }: { roleNames: string[] }) {
  return (
    <ActionForm action={createUserAction} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <FormMessage className="md:col-span-2" />
      <Field label="User name" name="userName" required>
        <Input id="userName" name="userName" autoComplete="off" maxLength={64} required />
      </Field>
      <Field label="Display name" name="displayName">
        <Input id="displayName" name="displayName" maxLength={200} />
      </Field>
      <Field label="Email" name="email" className="md:col-span-2">
        <Input id="email" name="email" type="email" maxLength={256} />
      </Field>
      <PasswordFields />
      <div className="md:col-span-2">
        <RolePicker roleNames={roleNames} selected={[]} />
      </div>
      <Checkbox name="isActive" defaultChecked label="Active (can sign in)" className="md:col-span-2" />
      <div className="flex gap-3 md:col-span-2">
        <SubmitButton pendingLabel="Creating…">Create user</SubmitButton>
        <LinkButton href="/security/users" variant="outline">
          Cancel
        </LinkButton>
      </div>
    </ActionForm>
  );
}

export function UserEditForm({ user, roleNames }: { user: SecurityUser; roleNames: string[] }) {
  return (
    <ActionForm action={updateUserAction.bind(null, user.userId)} className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <FormMessage className="md:col-span-2" />
      <Field label="Display name" name="displayName">
        <Input id="displayName" name="displayName" maxLength={200} defaultValue={user.displayName ?? ""} />
      </Field>
      <Field label="Email" name="email">
        <Input id="email" name="email" type="email" maxLength={256} defaultValue={user.email ?? ""} />
      </Field>
      <div className="md:col-span-2">
        <RolePicker roleNames={roleNames} selected={user.roles} />
      </div>
      <Checkbox name="isActive" defaultChecked={user.isActive} label="Active (can sign in)" className="md:col-span-2" />
      <div className="md:col-span-2">
        <SubmitButton>Save changes</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function PasswordResetForm({ userId }: { userId: string }) {
  return (
    <ActionForm action={resetPasswordAction.bind(null, userId)} className="space-y-5" resetOnSuccess>
      <FormMessage />
      <PasswordFields />
      <SubmitButton variant="outline" pendingLabel="Resetting…">
        Reset password
      </SubmitButton>
    </ActionForm>
  );
}

export function RoleForm({ role }: { role?: SecurityRole }) {
  const catalog = permissionCatalog();
  const selected = new Set(role?.permissions ?? []);
  const action = role ? updateRoleAction.bind(null, role.roleId) : createRoleAction;

  return (
    <ActionForm action={action} className="space-y-6">
      <FormMessage />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Role name" name="name" required hint="Used in the token's role claim, e.g. sms_admin.">
          <Input id="name" name="name" maxLength={64} defaultValue={role?.name} required />
        </Field>
        <Field label="Description" name="description">
          <Textarea id="description" name="description" rows={1} maxLength={500} defaultValue={role?.description ?? ""} />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-400">Permissions</legend>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {catalog.map((group) => (
            <div key={group.moduleKey} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                {group.moduleName}
                {group.status === "planned" && <span className="text-xs font-normal text-gray-400">(coming soon)</span>}
              </p>
              <div className="space-y-2">
                {group.permissions.map((permission) => (
                  <Checkbox
                    key={permission.key}
                    name="permissions"
                    value={permission.key}
                    defaultChecked={selected.has(permission.key)}
                    label={
                      <span>
                        {permission.label} <code className="text-xs text-gray-400">{permission.key}</code>
                      </span>
                    }
                    className="flex"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-3">
        <SubmitButton>{role ? "Save role" : "Create role"}</SubmitButton>
        <LinkButton href="/security/roles" variant="outline">
          Cancel
        </LinkButton>
      </div>
    </ActionForm>
  );
}
