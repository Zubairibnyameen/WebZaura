/**
 * Mirror of the database totals function, used only for the live preview in the builder.
 * The database recalculates and stores the real totals on every save.
 */
export type QuoteLine = { quantity: number; unit_price: number; item_discount?: number };
export type QuoteTotals = { subtotal: number; discount_total: number; tax_total: number; total: number };

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeTotals(
  items: QuoteLine[],
  discountType: "percent" | "amount",
  discountValue: number,
  taxRate: number,
): QuoteTotals {
  const subtotal = r2(items.reduce((s, i) => s + Math.max(r2((i.quantity || 0) * (i.unit_price || 0)) - (i.item_discount || 0), 0), 0));
  const dv = Math.max(discountValue || 0, 0);
  const discount_total = discountType === "percent" ? r2((subtotal * Math.min(dv, 100)) / 100) : Math.min(dv, subtotal);
  const taxable = r2(subtotal - discount_total);
  const tax_total = r2((taxable * Math.max(taxRate || 0, 0)) / 100);
  return { subtotal, discount_total, tax_total, total: r2(taxable + tax_total) };
}
