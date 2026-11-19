import type { ReactNode } from "react";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { ImageUpload } from "@/core/forms/image-upload";
import { cn } from "@/core/utils/cn";
import { formatDateTime } from "@/core/utils/format";
import { Badge } from "@/core/ui/badge";
import { createUserAction, setPasswordAction, setUserPermissionsAction, updateUserAction } from "../actions";
import type { RoleSummary, SecurityPermission, SecurityUser, UserPermissionSet } from "../types";
import { FormActions, PasswordFields, PermissionPicker, RolePicker } from "./form-parts";

const threeColumns = "grid grid-cols-1 gap-5 md:grid-cols-3";

/** The profile fields, three per row; `children` (e.g. the password fields) follow them. */
function ProfileFields({ user, children }: { user?: SecurityUser; children?: ReactNode }) {
  return (
    <div className="space-y-5">
      <div className={threeColumns}>
        <Field label="First name" name="name" required>
          <Input id="name" name="name" maxLength={200} defaultValue={user?.name} autoComplete="off" required />
        </Field>
        <Field label="Last name" name="lastName">
          <Input id="lastName" name="lastName" maxLength={150} defaultValue={user?.lastName ?? ""} autoComplete="off" />
        </Field>
        <Field label="Full name" name="fullName" hint="Empty = first and last name.">
          <Input id="fullName" name="fullName" maxLength={300} defaultValue={user?.fullName ?? ""} autoComplete="off" />
        </Field>

        <Field label="Email" name="email" required hint="Used to sign in.">
          <Input id="email" name="email" type="email" maxLength={256} autoComplete="off" defaultValue={user?.email} required />
        </Field>
        <Field label="Phone" name="cellphoneNo" required>
          <Input
            id="cellphoneNo"
            name="cellphoneNo"
            type="tel"
            maxLength={20}
            placeholder="01711-000000"
            autoComplete="off"
            defaultValue={user?.cellphoneNo ?? ""}
            required
          />
        </Field>
        <Field label="Status" name="status" hint="Inactive users cannot sign in.">
          <Select id="status" name="status" defaultValue={user?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </Field>

        <Field label="Address line 1" name="addressLine1">
          <Input id="addressLine1" name="addressLine1" maxLength={255} defaultValue={user?.addressLine1 ?? ""} />
        </Field>
        <Field label="Address line 2" name="addressLine2">
          <Input id="addressLine2" name="addressLine2" maxLength={255} defaultValue={user?.addressLine2 ?? ""} />
        </Field>
        <Field label="Short bio" name="shortBio">
          <Textarea id="shortBio" name="shortBio" rows={1} maxLength={500} defaultValue={user?.shortBio ?? ""} className="min-h-9" />
        </Field>
      </div>

      <div className={cn(threeColumns, "rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800")}>
        <Checkbox name="isEmailVerified" defaultChecked={user?.isEmailVerified ?? false} label="Email verified" />
        <Checkbox name="isPhoneVerified" defaultChecked={user?.isPhoneVerified ?? false} label="Phone verified" />
        <Checkbox name="isLocked" defaultChecked={user?.isLocked ?? false} label="Locked (cannot sign in)" />
      </div>

      {children}
    </div>
  );
}

/** The photo in a column of its own; for an existing user, when they last signed in and changed the password. */
function PhotoPanel({ user }: { user?: SecurityUser }) {
  return (
    <aside className="space-y-4 lg:border-l lg:border-gray-100 lg:pl-6 dark:lg:border-gray-800">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Photo</p>
      <ImageUpload
        id="photoUrl"
        name="photoUrl"
        folder="user"
        layout="stacked"
        round
        defaultValue={user?.photoUrl}
        alt={user ? `Photo of ${user.name}` : "Photo"}
      />
      {user && (
        <dl className="space-y-2 border-t border-gray-100 pt-4 text-xs dark:border-gray-800">
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Last sign-in</dt>
            <dd className="text-right text-gray-700 dark:text-gray-300">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">Password changed</dt>
            <dd className="text-right text-gray-700 dark:text-gray-300">
              {user.passwordChangedAt ? formatDateTime(user.passwordChangedAt) : "—"}
            </dd>
          </div>
        </dl>
      )}
    </aside>
  );
}

/**
 * A user's fields for the edit popup on the users list: the same as the user page (three per row, photo on the
 * right, roles below), without the form's own message and buttons, which the popup provides.
 */
export function UserFields({ user, roles }: { user: SecurityUser; roles: RoleSummary[] }) {
  const allRoles = [...roles, ...user.roles.filter((role) => !roles.some((known) => known.id === role.id))];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <ProfileFields user={user} />
        <PhotoPanel user={user} />
      </div>
      <RolePicker roles={allRoles} selected={user.roles.map((role) => role.id)} />
    </div>
  );
}

/** Fields on the left (three per row), the photo on the right; roles and the buttons under both. */
function UserFormBody({
  user,
  roles,
  selectedRoles,
  extra,
  actions,
}: {
  user?: SecurityUser;
  roles: RoleSummary[];
  selectedRoles: number[];
  extra?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <FormMessage />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <ProfileFields user={user}>{extra}</ProfileFields>
        <PhotoPanel user={user} />
      </div>
      <RolePicker roles={roles} selected={selectedRoles} />
      {actions}
    </div>
  );
}

export function UserCreateForm({ roles }: { roles: RoleSummary[] }) {
  return (
    <ActionForm action={createUserAction}>
      <fieldset>
        <UserFormBody
          roles={roles}
          selectedRoles={[]}
          extra={
            <div className={threeColumns}>
              <PasswordFields />
            </div>
          }
          actions={<FormActions submitLabel="Create user" cancelHref="/security/users" />}
        />
      </fieldset>
    </ActionForm>
  );
}

export function UserProfileForm({ user, roles, readOnly }: { user: SecurityUser; roles: RoleSummary[]; readOnly?: boolean }) {
  // Keep roles the list doesn't include (e.g. created meanwhile) selectable.
  const allRoles = [...roles, ...user.roles.filter((role) => !roles.some((known) => known.id === role.id))];
  return (
    <ActionForm action={updateUserAction.bind(null, user.id)}>
      <fieldset disabled={readOnly}>
        <UserFormBody
          user={user}
          roles={allRoles}
          selectedRoles={user.roles.map((role) => role.id)}
          actions={<FormActions readOnly={readOnly} submitLabel="Save user" />}
        />
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
