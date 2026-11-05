import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { LedgerHeadField } from "@/modules/accounting/components/ledger-head-picker";
import { mappedLedgerHead } from "@/modules/accounting/components/pickers";
import { FormSection, withCurrentOption } from "@/modules/purchase/components/setup/form-section";
import type { LookupOption } from "@/modules/settings/types";
import type { Customer } from "../../types";

const wide = "sm:col-span-2";

/** Fields of the add/edit customer modal, in sections. */
export function CustomerFields({
  value,
  groups,
}: {
  value?: Customer;
  /** Values of the "Customer Group" lookup list. */
  groups: LookupOption[];
}) {
  const groupOptions = withCurrentOption(groups, value?.customerGroupLookupDataId, value?.customerGroup);
  const opening = value?.openingBalance ?? 0;

  return (
    <div className="space-y-5">
      <FormSection title="Basics">
        <Field
          label="Code"
          name="code"
          hint={value ? "Unique in this organization. Leave empty to keep the current code." : "Leave empty for the next number (C-00001)."}
        >
          <Input id="code" name="code" maxLength={30} defaultValue={value?.code ?? ""} placeholder={value ? undefined : "Automatic"} autoComplete="off" />
        </Field>
        <Field label="Name" name="name" required>
          <Input id="name" name="name" maxLength={250} defaultValue={value?.name} required />
        </Field>
        <Field label="Name (Bangla)" name="nameLocal" hint="Optional, for printed invoices and money receipts.">
          <Input id="nameLocal" name="nameLocal" maxLength={250} defaultValue={value?.nameLocal ?? ""} lang="bn" />
        </Field>
        <Field label="Customer group" name="customerGroupLookupDataId" hint="From Settings → Lookup Data → Customer Group.">
          <Select
            id="customerGroupLookupDataId"
            name="customerGroupLookupDataId"
            defaultValue={value?.customerGroupLookupDataId ? String(value.customerGroupLookupDataId) : ""}
          >
            <option value="">No group</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </Field>
        <Checkbox
          name="isActive"
          defaultChecked={value?.isActive ?? true}
          label="Active (can be picked on new sales and receipts)"
          className={wide}
        />
        <Checkbox
          name="isSupplier"
          defaultChecked={value?.isSupplier ?? false}
          label="Also a supplier (listed under Purchase → Suppliers too)"
          className={wide}
        />
      </FormSection>

      <FormSection title="Contact & address">
        <Field label="Contact person" name="contactPerson">
          <Input id="contactPerson" name="contactPerson" maxLength={150} defaultValue={value?.contactPerson ?? ""} />
        </Field>
        <Field label="Mobile" name="mobile" hint="The counter finds customers by their mobile number.">
          <Input id="mobile" name="mobile" type="tel" maxLength={30} defaultValue={value?.mobile ?? ""} placeholder="01XXXXXXXXX" />
        </Field>
        <Field label="Phone" name="phone">
          <Input id="phone" name="phone" type="tel" maxLength={30} defaultValue={value?.phone ?? ""} />
        </Field>
        <Field label="Email" name="email">
          <Input id="email" name="email" type="email" maxLength={150} defaultValue={value?.email ?? ""} autoComplete="off" />
        </Field>
        <Field label="Address line 1" name="addressLine1" className={wide}>
          <Input id="addressLine1" name="addressLine1" maxLength={250} defaultValue={value?.addressLine1 ?? ""} />
        </Field>
        <Field label="Address line 2" name="addressLine2" className={wide}>
          <Input id="addressLine2" name="addressLine2" maxLength={250} defaultValue={value?.addressLine2 ?? ""} />
        </Field>
        <Field label="City / district" name="city">
          <Input id="city" name="city" maxLength={100} defaultValue={value?.city ?? ""} />
        </Field>
        <Field label="State / division" name="state">
          <Input id="state" name="state" maxLength={100} defaultValue={value?.state ?? ""} />
        </Field>
        <Field label="Postal code" name="postalCode">
          <Input id="postalCode" name="postalCode" maxLength={20} defaultValue={value?.postalCode ?? ""} />
        </Field>
        <Field label="Country code" name="countryCode" hint="2-letter ISO code, e.g. BD.">
          <Input
            id="countryCode"
            name="countryCode"
            maxLength={2}
            pattern="[A-Za-z]{2}"
            defaultValue={value?.countryCode ?? ""}
            placeholder="BD"
            className="uppercase"
            autoComplete="off"
          />
        </Field>
      </FormSection>

      <FormSection title="Identity & tax">
        <Field label="National ID (NID)" name="nationalIdNo">
          <Input id="nationalIdNo" name="nationalIdNo" maxLength={30} defaultValue={value?.nationalIdNo ?? ""} autoComplete="off" />
        </Field>
        <Field label="BIN (VAT registration)" name="taxRegistrationNo" hint="Business Identification Number, for business customers.">
          <Input id="taxRegistrationNo" name="taxRegistrationNo" maxLength={50} defaultValue={value?.taxRegistrationNo ?? ""} />
        </Field>
      </FormSection>

      <FormSection
        title="Credit & opening balance"
        description="The opening balance is what stood between you and the customer before you started using this system."
      >
        <Field label="Payment terms (days)" name="paymentTermsDays" hint="Credit sales fall due this many days after the invoice; 0 = on the day.">
          <Input
            id="paymentTermsDays"
            name="paymentTermsDays"
            type="number"
            min={0}
            max={3650}
            step={1}
            defaultValue={String(value?.paymentTermsDays ?? 0)}
          />
        </Field>
        <Field label="Credit limit" name="creditLimit" hint="The most the customer may owe at once. Leave empty for no limit; 0 = cash only.">
          <Input
            id="creditLimit"
            name="creditLimit"
            inputMode="decimal"
            defaultValue={value?.creditLimit === null || value?.creditLimit === undefined ? "" : String(value.creditLimit)}
            placeholder="No limit"
          />
        </Field>
        <Field
          label="Ledger head"
          name="accSubClassId"
          className="sm:col-span-2"
          hint="The receivable head a credit sale is debited to when the sale is finalized. Shared with the supplier side."
        >
          <LedgerHeadField id="accSubClassId" name="accSubClassId" defaultValue={value ? mappedLedgerHead(value) : null} />
        </Field>
        <Field label="Opening balance" name="openingBalance">
          <div className="flex gap-2">
            <div className="min-w-0 flex-1">
              <Input
                id="openingBalance"
                name="openingBalance"
                inputMode="decimal"
                defaultValue={opening === 0 ? "" : String(Math.abs(opening))}
                placeholder="0.00"
              />
            </div>
            <div className="w-44 shrink-0">
              <Select name="openingBalanceSide" aria-label="Opening balance side" defaultValue={opening < 0 ? "advance" : "owed"}>
                <option value="owed">Owed by customer</option>
                <option value="advance">Advance received</option>
              </Select>
            </div>
          </div>
        </Field>
        <Field label="Opening balance date" name="openingBalanceDate" hint="The date the opening balance stood at.">
          <Input id="openingBalanceDate" name="openingBalanceDate" type="date" defaultValue={value?.openingBalanceDate ?? ""} />
        </Field>
      </FormSection>

      <Field label="Remarks" name="remarks">
        <Textarea id="remarks" name="remarks" rows={3} maxLength={1000} defaultValue={value?.remarks ?? ""} />
      </Field>
    </div>
  );
}
