import { Checkbox, Field, Input, Select, Textarea } from "@/core/forms/fields";
import { formatAmount, todayIso } from "@/core/utils/number";
import { CLAIM_OUTCOMES, OPEN_STATUSES, RESOLUTIONS, warrantyLabel, type ServiceJob, type SupplierOption } from "../types";

// Fields of the service desk's action modals (each posts to its Server Action in ../actions).

/** Update status: where the job stands now, how it ended (for Ready), and a timeline note. */
export function StatusFields({ job }: { job: ServiceJob }) {
  return (
    <>
      {job.resolution && <input type="hidden" name="hasResolution" value="true" />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status" name="status" required>
          <Select id="status" name="status" defaultValue={job.status}>
            {OPEN_STATUSES.map((status) => (
              <option key={status} value={status}>
                {warrantyLabel(status)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="How it ended" name="resolution" hint="Needed to mark the job Ready.">
          <Select id="resolution" name="resolution" defaultValue={job.resolution ?? ""}>
            <option value="">Not yet</option>
            {RESOLUTIONS.map((value) => (
              <option key={value} value={value}>
                {warrantyLabel(value)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Work done" name="resolutionNote" hint="For the customer, e.g. replaced keyboard, cleaned fan.">
        <Textarea id="resolutionNote" name="resolutionNote" rows={2} maxLength={2000} defaultValue={job.resolutionNote ?? ""} />
      </Field>
      <Field label="Note for the timeline" name="note">
        <Input id="note" name="note" maxLength={1000} />
      </Field>
      <Checkbox name="customerNotified" label="The customer was told (call or SMS)" />
    </>
  );
}

/** The customer's answer to the estimate. */
export function ApprovalFields({ job }: { job: ServiceJob }) {
  return (
    <>
      <Field label="Estimate agreed" name="estimatedAmount">
        <Input id="estimatedAmount" name="estimatedAmount" inputMode="decimal" defaultValue={job.estimatedAmount || ""} />
      </Field>
      <Field label="Note" name="note">
        <Input id="note" name="note" maxLength={1000} />
      </Field>
    </>
  );
}

/** Billing the job: a sales invoice made from its items. */
export function BillFields({ job }: { job: ServiceJob }) {
  return (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {job.itemCount} item(s), {formatAmount(job.itemsTotal)} before tax. Parts leave stock and warranty cards are issued when the invoice is completed.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sale type" name="saleType" required>
          <Select id="saleType" name="saleType" defaultValue="Cash">
            <option value="Cash">Cash (paid in full)</option>
            {job.customerId && <option value="Credit">Credit (customer on file)</option>}
          </Select>
        </Field>
        <Field label="Paid by" name="paymentMethod">
          <Select id="paymentMethod" name="paymentMethod" defaultValue="Cash">
            <option value="Cash">Cash</option>
            <option value="MobileWallet">Mobile wallet</option>
            <option value="Card">Card</option>
            <option value="Bank">Bank</option>
          </Select>
        </Field>
      </div>
      {job.customerId && (
        <Field label="Paid now (credit sale)" name="paidAmount" hint="Ignored for a cash sale, which is paid in full.">
          <Input id="paidAmount" name="paidAmount" inputMode="decimal" />
        </Field>
      )}
      <Field label="Remarks on the invoice" name="remarks">
        <Input id="remarks" name="remarks" maxLength={1000} placeholder={`Service job ${job.jobNo}`} />
      </Field>
      <Checkbox name="post" defaultChecked label="Complete the invoice now (otherwise it stays a draft in Sales)" />
    </>
  );
}

export function DeliverFields() {
  return (
    <>
      <Field label="Collected by" name="deliveredToName" hint="Leave empty when the customer collected it.">
        <Input id="deliveredToName" name="deliveredToName" maxLength={150} />
      </Field>
      <Field label="Note" name="note">
        <Input id="note" name="note" maxLength={1000} placeholder="e.g. tested in front of the customer" />
      </Field>
      <Checkbox name="customerNotified" label="The customer was told (call or SMS)" />
    </>
  );
}

export function ReasonFields({ label, hint }: { label: string; hint?: string }) {
  return (
    <Field label={label} name="reason" required hint={hint}>
      <Textarea id="reason" name="reason" rows={2} maxLength={500} required />
    </Field>
  );
}

/** Sending the job's unit to a supplier (product and serial default to the job's). */
export function JobClaimFields({ job, suppliers }: { job: ServiceJob; suppliers: SupplierOption[] }) {
  return (
    <>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {job.productName ? `${job.productName}${job.serialNo ? ` · SN ${job.serialNo}` : ""}` : "Name the product on the claim from the Supplier claims tab if the job has none."}
      </p>
      <SupplierSelect suppliers={suppliers} />
      <Field label="Fault" name="problemDescription" required>
        <Textarea id="problemDescription" name="problemDescription" rows={2} maxLength={2000} defaultValue={job.diagnosis ?? job.problemDescription} required />
      </Field>
      <ClaimDates />
    </>
  );
}

export function SupplierSelect({ suppliers }: { suppliers: SupplierOption[] }) {
  return (
    <Field label="Supplier / service center" name="supplierId" required>
      <Select id="supplierId" name="supplierId" defaultValue="" required>
        <option value="">Choose…</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} ({s.code})
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function ClaimDates() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Sent on" name="sentDate">
          <Input id="sentDate" name="sentDate" type="date" defaultValue={todayIso()} />
        </Field>
        <Field label="Expected back" name="expectedReturnDate">
          <Input id="expectedReturnDate" name="expectedReturnDate" type="date" />
        </Field>
        <Field label="Their RMA / ticket no." name="supplierReferenceNo">
          <Input id="supplierReferenceNo" name="supplierReferenceNo" maxLength={100} />
        </Field>
      </div>
      <Field label="Remarks" name="remarks">
        <Input id="remarks" name="remarks" maxLength={1000} />
      </Field>
    </>
  );
}

/** The unit is back from the supplier. */
export function ClaimReturnFields() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What they did" name="outcome" required>
          <Select id="outcome" name="outcome" defaultValue="Repaired" required>
            {CLAIM_OUTCOMES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Back on" name="returnedDate">
          <Input id="returnedDate" name="returnedDate" type="date" defaultValue={todayIso()} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Replacement serial no." name="replacementSerialNo" hint="When they sent a new unit.">
          <Input id="replacementSerialNo" name="replacementSerialNo" maxLength={100} />
        </Field>
        <Field label="Their charge" name="serviceChargeAmount" hint="What the supplier charges you, if anything.">
          <Input id="serviceChargeAmount" name="serviceChargeAmount" inputMode="decimal" />
        </Field>
      </div>
      <Field label="Remarks" name="remarks">
        <Input id="remarks" name="remarks" maxLength={1000} />
      </Field>
    </>
  );
}
