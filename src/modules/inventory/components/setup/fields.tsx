import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { LedgerHeadField } from "@/modules/accounting/components/ledger-head-picker";
import { mappedLedgerHead } from "@/modules/accounting/components/pickers";
import { UNIT_TYPES, WAREHOUSE_TYPES, type Brand, type Category, type Unit, type Warehouse } from "../../types";

/** Readable warehouse types: a Store sells (shop/outlet), a Warehouse holds stock (godown). */
export const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  Store: "Store (shop or outlet)",
  Warehouse: "Warehouse (godown)",
};

/** Fields of the add/edit unit modal. */
export function UnitFields({ value }: { value?: Unit }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" name="code" required hint="Short and unique, e.g. kg, bag, pcs.">
          <Input id="code" name="code" maxLength={20} defaultValue={value?.code} required />
        </Field>
        <Field label="Type" name="unitType" required>
          <Select id="unitType" name="unitType" defaultValue={value?.unitType ?? "Count"} required>
            {UNIT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" name="name" required hint="e.g. Kilogram, Bag, Piece.">
          <Input id="name" name="name" maxLength={100} defaultValue={value?.name} required />
        </Field>
        <Field label="Local name" name="nameLocal" hint="Bangla name, e.g. কেজি.">
          <Input id="nameLocal" name="nameLocal" maxLength={100} defaultValue={value?.nameLocal ?? ""} lang="bn" />
        </Field>
        <Field label="ISO code" name="isoCode" hint="Optional, e.g. KGM or LTR.">
          <Input id="isoCode" name="isoCode" maxLength={10} defaultValue={value?.isoCode ?? ""} />
        </Field>
      </div>
      <div className="flex flex-col gap-3">
        <Checkbox name="allowDecimal" defaultChecked={value?.allowDecimal ?? false} label="Allow fractions (e.g. 2.5 kg)" />
        <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (shown in pickers)" />
      </div>
    </>
  );
}

/** Fields of the add/edit category modal. The parent picker leaves out the category and its sub-categories. */
export function CategoryFields({
  value,
  categories,
  defaultParentId,
}: {
  value?: Category;
  /** Every category of the organization (from the options call), for the parent picker. */
  categories: Pick<Category, "id" | "path" | "isActive">[];
  /** Pre-selected parent when adding (the list's current parent filter). */
  defaultParentId?: number;
}) {
  const parents = value
    ? categories.filter((category) => category.id !== value.id && !category.path.startsWith(`${value.path} > `))
    : categories;
  const parentId = value ? value.parentCategoryId : defaultParentId;

  return (
    <>
      <Field label="Parent" name="parentCategoryId" hint="Leave empty for a top-level group, e.g. Fertilizer.">
        <Select id="parentCategoryId" name="parentCategoryId" defaultValue={parentId ? String(parentId) : ""}>
          <option value="">None (top level)</option>
          {parents.map((category) => (
            <option key={category.id} value={category.id}>
              {category.path}
              {category.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" name="name" required hint="e.g. Urea, Insecticide, Pipe fittings.">
          <Input id="name" name="name" maxLength={150} defaultValue={value?.name} required />
        </Field>
        <Field label="Local name" name="nameLocal" hint="Bangla name, e.g. ইউরিয়া.">
          <Input id="nameLocal" name="nameLocal" maxLength={150} defaultValue={value?.nameLocal ?? ""} lang="bn" />
        </Field>
        <Field label="Code" name="code" hint="Optional short code.">
          <Input id="code" name="code" maxLength={30} defaultValue={value?.code ?? ""} />
        </Field>
        <Field label="Sort order" name="sortOrder" hint="Lower numbers come first.">
          <Input id="sortOrder" name="sortOrder" inputMode="numeric" defaultValue={String(value?.sortOrder ?? 0)} />
        </Field>
      </div>
      <Field label="Ledger head" name="accSubClassId" hint="Optional. The chart of accounts head (sub class) mapped to this category.">
        <LedgerHeadField id="accSubClassId" name="accSubClassId" defaultValue={value ? mappedLedgerHead(value) : null} />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (shown in pickers)" />
    </>
  );
}

/** Fields of the add/edit brand modal. */
export function BrandFields({ value }: { value?: Brand }) {
  return (
    <>
      <Field label="Name" name="name" required hint="The maker or label, e.g. ACI, Syngenta, RFL.">
        <Input id="name" name="name" maxLength={150} defaultValue={value?.name} required />
      </Field>
      <Field label="Local name" name="nameLocal" hint="Bangla name (optional).">
        <Input id="nameLocal" name="nameLocal" maxLength={150} defaultValue={value?.nameLocal ?? ""} lang="bn" />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (shown in pickers)" />
    </>
  );
}

/** Fields of the add/edit warehouse modal. */
export function WarehouseFields({ value }: { value?: Warehouse }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" name="code" required hint="Short and unique, e.g. SHOP-1, GD-1.">
          <Input id="code" name="code" maxLength={30} defaultValue={value?.code} required />
        </Field>
        <Field label="Type" name="warehouseType" required>
          <Select id="warehouseType" name="warehouseType" defaultValue={value?.warehouseType ?? "Store"} required>
            {WAREHOUSE_TYPES.map((type) => (
              <option key={type} value={type}>
                {WAREHOUSE_TYPE_LABELS[type] ?? type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Name" name="name" required hint="e.g. Main shop, Bazar godown.">
          <Input id="name" name="name" maxLength={150} defaultValue={value?.name} required />
        </Field>
        <Field label="Local name" name="nameLocal" hint="Bangla name (optional).">
          <Input id="nameLocal" name="nameLocal" maxLength={150} defaultValue={value?.nameLocal ?? ""} lang="bn" />
        </Field>
        <Field label="Phone" name="phone">
          <Input id="phone" name="phone" type="tel" maxLength={30} defaultValue={value?.phone ?? ""} />
        </Field>
      </div>
      <Field label="Address" name="address">
        <Textarea id="address" name="address" rows={2} maxLength={500} defaultValue={value?.address ?? ""} />
      </Field>
      <Checkbox name="isActive" defaultChecked={value?.isActive ?? true} label="Active (shown in pickers)" />
    </>
  );
}
