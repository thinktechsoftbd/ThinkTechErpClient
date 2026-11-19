import { ActionForm, FormMessage } from "@/core/forms/action-form";
import { Checkbox, Field, Input, Select } from "@/core/forms/fields";
import { saveMenuAction } from "../actions";
import { flattenMenuTree, menuAndDescendantIds } from "../menu-tree";
import { MENU_GROUP_PATH, type RoleSummary, type SecurityMenu } from "../types";
import { FormActions, RolePicker } from "./form-parts";
import { MenuIconField } from "./menu-icon-field";

type MenuFieldsProps = {
  menu?: SecurityMenu;
  /** Every menu, for the parent picker. */
  menus: SecurityMenu[];
  roles: RoleSummary[];
  /** Pre-selected parent when adding a submenu. */
  defaultParentId?: number | null;
};

export function MenuForm({ readOnly, ...fields }: MenuFieldsProps & { readOnly?: boolean }) {
  const { menu } = fields;
  return (
    <ActionForm action={saveMenuAction.bind(null, menu?.id ?? null)}>
      <fieldset disabled={readOnly} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <FormMessage className="md:col-span-2" />
        <MenuFields {...fields} />
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

/**
 * A menu's fields, as items of a two-column grid the caller provides: the menu page's form and the new / edit /
 * submenu popups on the menus list.
 */
export function MenuFields({ menu, menus, roles, defaultParentId }: MenuFieldsProps) {
  const excluded = menu ? menuAndDescendantIds(menus, menu.id) : new Set<number>();
  const parentOptions = flattenMenuTree(menus).filter(({ menu: option }) => !excluded.has(option.id));
  const parentId = menu ? menu.parentId : (defaultParentId ?? null);

  return (
    <>
      <Field label="Title" name="title" required>
        <Input id="title" name="title" maxLength={100} defaultValue={menu?.title} required />
      </Field>
      <Field
        label="Path"
        name="path"
        required
        hint={`Page route, e.g. /sms/providers. Use "${MENU_GROUP_PATH}" for a group that only holds submenus.`}
      >
        <Input id="path" name="path" maxLength={300} defaultValue={menu?.path} className="font-mono" autoComplete="off" required />
      </Field>
      <Field label="Parent menu" name="parentId" hint="Leave empty for a top-level menu.">
        <Select id="parentId" name="parentId" defaultValue={parentId ? String(parentId) : ""}>
          <option value="">— Top level —</option>
          {parentOptions.map(({ menu: option, depth }) => (
            <option key={option.id} value={option.id}>
              {`${"   ".repeat(depth)}${option.title}${option.path === MENU_GROUP_PATH ? "" : ` (${option.path})`}`}
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
      <RolePicker
        legend="Visible to"
        roles={roles}
        selected={menu?.roleIds ?? []}
        hint="Users with any of the ticked roles see it; tick none for everyone signed in. Users can still be given or denied a menu under Users → Menu access."
        className="md:col-span-2"
      />
      <Checkbox
        name="isActive"
        defaultChecked={menu?.isActive ?? true}
        label="Active (shown in the sidebar)"
        className="md:col-span-2"
      />
    </>
  );
}
