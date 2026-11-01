// Line amounts as the API calculates them (TaxCalculator / PurchaseDocumentService), so editors
// show the same totals before saving. The API recalculates everything on save.

import { round } from "@/core/utils/number";

export type RateLike = { ratePercent: number; isCompound: boolean; sequenceNo: number; isRecoverable?: boolean };

/** Tax on amount at these rates; compound rates apply on the amount plus the taxes before them. */
export function computeTax(amount: number, rates: readonly RateLike[] | undefined, inclusive: boolean) {
  if (!rates || rates.length === 0) return { taxable: round(amount), tax: 0 };
  const ordered = [...rates].sort((a, b) => a.sequenceNo - b.sequenceNo);
  let running = 0;
  const factors = ordered.map((rate) => {
    const factor = (rate.ratePercent / 100) * (rate.isCompound ? 1 + running : 1);
    running += factor;
    return factor;
  });
  const taxable = inclusive ? amount / (1 + running) : amount;
  const tax = factors.reduce((sum, factor) => sum + round(taxable * factor), 0);
  return { taxable: round(taxable), tax: round(tax) };
}

export type LineAmounts = { gross: number; discount: number; net: number; tax: number; total: number };

export function computeLine(input: {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  rates?: readonly RateLike[];
  inclusive: boolean;
  withTax: boolean;
}): LineAmounts {
  const gross = round(input.quantity * input.unitPrice);
  const discount = Math.min(gross, round((gross * input.discountPercent) / 100));
  const net = gross - discount;
  const { tax } = input.withTax ? computeTax(net, input.rates, input.inclusive) : { tax: 0 };
  return { gross, discount, net, tax, total: input.withTax && !input.inclusive ? round(net + tax) : net };
}
