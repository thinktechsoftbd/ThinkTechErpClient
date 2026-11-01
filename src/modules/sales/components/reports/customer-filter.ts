import "server-only";
import { tryApi } from "@/core/api/client";
import { salesApi } from "@/modules/sales/api";
import { getCustomerOptions } from "@/modules/sales/queries";
import { customerOptions } from "./report-helpers";

/**
 * Customers for a report's customer select. The shared list holds the first 500; a chosen customer
 * beyond them (e.g. arriving from a link) is loaded by id so the select and the subtitle still name it.
 */
export async function getCustomerFilterOptions(customerId: number | undefined) {
  const result = await getCustomerOptions();
  const customers = result.ok ? result.data : [];
  if (customerId === undefined || customers.some((customer) => customer.id === customerId)) return customerOptions(customers);

  const chosen = await tryApi(() => salesApi.customers.options({ ids: String(customerId), limit: 1 }));
  return customerOptions(chosen.ok ? [...chosen.data, ...customers] : customers);
}
