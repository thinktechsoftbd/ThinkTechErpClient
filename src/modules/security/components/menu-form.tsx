import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import { saveMenuAction } from "../actions";
import { flattenMenuTree, menuAndDescendantIds } from "../menu-tree";
import { MENU_GROUP_PATH, type RoleSummary, type SecurityMenu } from "../types";
import { FormActions } from "./form-parts";
import { MenuIconField } from "./menu-icon-field";

export function MenuForm({
  menu,
  menus,
  roles,
  defaultParentId,
  readOnly,
}: {
  menu?: SecurityMenu;
  /** Every menu, for the parent picker. */
  menus: SecurityMenu[];
  roles: RoleSummary[];
  /** Pre-selected parent when adding a submenu. */
  defaultParentId?: number | null;
  readOnly?: boolean;
}) {
  const excluded = menu ? menuAndDescendantIds(menus, menu.id) : new Set<number>();
  const parentOptions = flattenMenuTree(menus).filter(({ menu: option }) => !excluded.has(option.id));
  const parentId = menu ? menu.parentId : (defaultParentId ?? null);

  return (
    <ActionForm action={saveMenuAction.bind(null, menu?.id ?? null)}>
      <fieldset disabled={readOnly} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormMessage className="md:col-span-2" />
        <Field label="Title" name="title" required>
          <Input id="title" name="title" maxLength={100} defaultValue={menu?.title} required />
        </Field>
        <Field
          label="Path"
          name="path"
          required
          hint={`Page route, e.g. /sms/clients. Use "${MENU_GROUP_PATH}" for a group that only holds submenus.`}
        >
          <Input id="path" name="path" maxLength={300} defaultValue={menu?.path} className="font-mono" autoComplete="off" required />
        </Field>
        <Field label="Parent menu" name="parentId" hint="Leave empty for a top-level menu.">
          <Select id="parentId" name="parentId" defaultValue={parentId ? String(parentId) : ""}>
            <option value="">— Top level —</option>
            {parentOptions.map(({ menu: option, depth }) => (
              <option key={option.id} value={option.id}>
                {`${"   ".repeat(depth)}${option.title}${option.path === MENU_GROUP_PATH ? "" : ` (${option.path})`}`}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sort order" name="sortOrder" hint="Lower numbers come first among siblings.">
          <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={menu?.sortOrder ?? 0} />
        </Field>
        <Field label="Icon" name="icon" hint="Lucide icon name (lucide.dev/icons). Shown for top-level menus.">
          <MenuIconField defaultValue={menu?.icon} />
        </Field>
        <Field label="Visible to" name="roleId" hint="Users can still be given or denied a menu under Users → Menu access.">
          <Select id="roleId" name="roleId" defaultValue={menu?.roleId ? String(menu.roleId) : ""}>
            <option value="">Everyone signed in</option>
            {[...roles]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((role) => (
                <option key={role.id} value={role.id}>
                  Only role: {role.name}
                </option>
              ))}
          </Select>
        </Field>
        <Checkbox
          name="isActive"
          defaultChecked={menu?.isActive ?? true}
          label="Active (shown in the sidebar)"
          className="md:col-span-2"
        />
        <FormActions
          readOnly={readOnly}
          submitLabel={menu ? "Save menu" : "Create menu"}
          cancelHref={menu ? undefined : "/security/menus"}
          className="md:col-span-2"
        />
      </fieldset>
    </ActionForm>
  );
}
