import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import type { LookupOption } from "@/modules/settings/types";
import type { Supplier } from "../../types";
import { FormSection, withCurrentOption } from "./form-section";

const wide = "sm:col-span-2";

/** Fields of the add/edit supplier modal, in sections. */
export function SupplierFields({
  value,
  groups,
  currencies,
}: {
  value?: Supplier;
  /** Values of the "Supplier Group" lookup list. */
  groups: LookupOption[];
  /** Values of the "Currency" lookup list. */
  currencies: LookupOption[];
}) {
  const groupOptions = withCurrentOption(groups, value?.supplierGroupLookupDataId, value?.supplierGroup);
  const currencyOptions = withCurrentOption(currencies, value?.currencyLookupDataId, value?.currency);
  const opening = value?.openingBalance ?? 0;

  return (
    <div className="space-y-5">
      <FormSection title="Basics">
        <Field label="Code" name="code" required hint="Unique in this organization, e.g. SUP-001.">
          <Input id="code" name="code" maxLength={30} defaultValue={value?.code} required autoComplete="off" />
        </Field>
        <Field label="Name" name="name" required>
          <Input id="name" name="name" maxLength={250} defaultValue={value?.name} required />
        </Field>
        <Field label="Name (Bangla)" name="nameLocal" hint="Optional, for printed documents.">
          <Input id="nameLocal" name="nameLocal" maxLength={250} defaultValue={value?.nameLocal ?? ""} lang="bn" />
        </Field>
        <Field label="Supplier group" name="supplierGroupLookupDataId" hint="From Settings → Lookup Data → Supplier Group.">
          <Select
            id="supplierGroupLookupDataId"
            name="supplierGroupLookupDataId"
            defaultValue={value?.supplierGroupLookupDataId ? String(value.supplierGroupLookupDataId) : ""}
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
          label="Active (can be picked on new purchases)"
          className={wide}
        />
      </FormSection>

      <FormSection title="Contact & address">
        <Field label="Contact person" name="contactPerson">
          <Input id="contactPerson" name="contactPerson" maxLength={150} defaultValue={value?.contactPerson ?? ""} />
        </Field>
        <Field label="Mobile" name="mobile">
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

      <FormSection title="Tax & licences">
        <Field label="BIN (VAT registration)" name="taxRegistrationNo" hint="Business Identification Number.">
          <Input id="taxRegistrationNo" name="taxRegistrationNo" maxLength={50} defaultValue={value?.taxRegistrationNo ?? ""} />
        </Field>
        <Field label="TIN" name="taxIdNo" hint="Taxpayer's Identification Number.">
          <Input id="taxIdNo" name="taxIdNo" maxLength={50} defaultValue={value?.taxIdNo ?? ""} />
        </Field>
        <Field label="Trade licence no" name="tradeLicenseNo">
          <Input id="tradeLicenseNo" name="tradeLicenseNo" maxLength={50} defaultValue={value?.tradeLicenseNo ?? ""} />
        </Field>
        <Field label="Regulatory licence no" name="regulatoryLicenseNo" hint="E.g. a fertilizer or pesticide dealer licence.">
          <Input
            id="regulatoryLicenseNo"
            name="regulatoryLicenseNo"
            maxLength={100}
            defaultValue={value?.regulatoryLicenseNo ?? ""}
          />
        </Field>
      </FormSection>

      <FormSection
        title="Terms & opening balance"
        description="The opening balance is what stood between you and the supplier before you started using this system."
      >
        <Field label="Currency" name="currencyLookupDataId" hint="The supplier's usual billing currency.">
          <Select
            id="currencyLookupDataId"
            name="currencyLookupDataId"
            defaultValue={value?.currencyLookupDataId ? String(value.currencyLookupDataId) : ""}
          >
            <option value="">Base currency</option>
            {currencyOptions.map((currency) => (
              <option key={currency.id} value={currency.id}>
                {currency.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment terms (days)" name="paymentTermsDays" hint="Credit purchases fall due this many days after the invoice; 0 = on the day.">
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
        <Field label="Credit limit" name="creditLimit" hint="Leave empty for no limit.">
          <Input
            id="creditLimit"
            name="creditLimit"
            inputMode="decimal"
            defaultValue={value?.creditLimit === null || value?.creditLimit === undefined ? "" : String(value.creditLimit)}
            placeholder="No limit"
          />
        </Field>
        <div aria-hidden className="hidden sm:block" />
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
                <option value="owed">Owed to supplier</option>
                <option value="advance">Advance paid</option>
              </Select>
            </div>
          </div>
        </Field>
        <Field label="Opening balance date" name="openingBalanceDate" hint="The date the opening balance stood at.">
          <Input id="openingBalanceDate" name="openingBalanceDate" type="date" defaultValue={value?.openingBalanceDate ?? ""} />
        </Field>
      </FormSection>

      <FormSection title="Bank & wallet" description="Where payments to this supplier go.">
        <Field label="Bank name" name="bankName">
          <Input id="bankName" name="bankName" maxLength={150} defaultValue={value?.bankName ?? ""} />
        </Field>
        <Field label="Branch" name="bankBranch">
          <Input id="bankBranch" name="bankBranch" maxLength={150} defaultValue={value?.bankBranch ?? ""} />
        </Field>
        <Field label="Account name" name="bankAccountName">
          <Input id="bankAccountName" name="bankAccountName" maxLength={150} defaultValue={value?.bankAccountName ?? ""} />
        </Field>
        <Field label="Account no" name="bankAccountNo">
          <Input id="bankAccountNo" name="bankAccountNo" maxLength={50} defaultValue={value?.bankAccountNo ?? ""} autoComplete="off" />
        </Field>
        <Field label="Routing code" name="bankRoutingCode" hint="The branch's routing number.">
          <Input id="bankRoutingCode" name="bankRoutingCode" maxLength={30} defaultValue={value?.bankRoutingCode ?? ""} />
        </Field>
        <Field label="Mobile wallet no" name="mobileWalletNo" hint="bKash or Nagad number.">
          <Input
            id="mobileWalletNo"
            name="mobileWalletNo"
            type="tel"
            maxLength={30}
            defaultValue={value?.mobileWalletNo ?? ""}
            placeholder="01XXXXXXXXX"
          />
        </Field>
      </FormSection>

      <Field label="Remarks" name="remarks">
        <Textarea id="remarks" name="remarks" rows={3} maxLength={1000} defaultValue={value?.remarks ?? ""} />
      </Field>
    </div>
  );
}
