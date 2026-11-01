import { redirect } from "next/navigation";

/** Sales opens on the sales list, the screen the counter uses most. */
export default function SalesPage() {
  redirect("/sales/invoices");
}
