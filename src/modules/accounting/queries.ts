import "server-only";
import { cache } from "react";
import { tryApi } from "@/core/api/client";
import { accountingApi } from "./api";
import type { PartyType } from "./types";

/** Every ledger head (sub class) for the pickers, active first, loaded once per request. */
export const getLedgerHeads = cache(() => tryApi(() => accountingApi.chart.ledgerHeads({ includeInactive: true, limit: 500 })));

/** Suppliers or customers for the subsidiary-ledger pickers (active first). */
export const getParties = cache((type: PartyType) => tryApi(() => accountingApi.parties(type, { limit: 500 })));
