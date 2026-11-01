import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { accountingApi } from "./api";
import type { PartyType } from "./types";

/** Every ledger head (sub class) for the pickers, loaded once per request. */
export const getLedgerHeads = cache(() => tryApi(() => accountingApi.ledgerHeads({ limit: 500 })));

/** Suppliers, customers, or both (no type), for the voucher and report pickers (active first). */
export const getParties = cache((type?: PartyType) => tryApi(() => accountingApi.parties(type, { limit: 500 })));
