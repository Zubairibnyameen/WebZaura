import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/quote-math";
import { fmtDate } from "@/lib/crm-format";

describe("quotation totals", () => {
  it("applies percent discount then 18% GST", () => {
    const t = computeTotals([{ quantity: 2, unit_price: 25000 }, { quantity: 1, unit_price: 10000, item_discount: 1000 }], "percent", 10, 18);
    expect(t).toEqual({ subtotal: 59000, discount_total: 5900, tax_total: 9558, total: 62658 });
  });
  it("caps an amount discount at the subtotal", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 500 }], "amount", 900, 18);
    expect(t.total).toBe(0);
  });
});

describe("dates", () => {
  it("formats as DD MMM YYYY", () => {
    expect(fmtDate("2026-10-05")).toBe("05 Oct 2026");
  });
});

import { invoiceStatus, invoiceBase, extractMentions } from "@/lib/crm-format";
describe("invoices", () => {
  it("is overdue when past due and not paid", () => {
    expect(invoiceStatus({ payment_status: "partially_paid", due_date: "2026-01-01" }, "2026-02-01")).toBe("overdue");
    expect(invoiceStatus({ payment_status: "paid", due_date: "2026-01-01" }, "2026-02-01")).toBe("paid");
  });
  it("bills a 30% advance of the pre-GST amount", () => {
    expect(invoiceBase(53100, "percent", 30)).toBe(15930);
  });
  it("finds mentions of teammates only", () => {
    expect(extractMentions("hi @arsh and @nobody", [{ id: "1", handle: "arsh" }])).toEqual(["1"]);
  });
});
