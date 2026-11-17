import { redirect } from "next/navigation";

/** Warranty opens on the service desk, the screen the counter uses most. */
export default function WarrantyPage() {
  redirect("/warranty/service");
}
