import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { warrantyApi } from "./api";

/** Laptop, Desktop PC, CC Camera, Printer, Mobile, Other (the Service Device Type lookup). */
export const getDeviceTypes = cache(() => tryApi(() => warrantyApi.lookups.deviceTypes()));

/** People who work in the organization, for the technician picker. */
export const getTechnicians = cache(() => tryApi(() => warrantyApi.lookups.technicians()));

/** Warranty policies for pickers and filters (inactive ones too, marked). */
export const getPolicyOptions = cache(() => tryApi(() => warrantyApi.policies.options(true)));

/** Suppliers for the claim form. */
export const getSupplierOptions = cache(() => tryApi(() => warrantyApi.lookups.suppliers()));
