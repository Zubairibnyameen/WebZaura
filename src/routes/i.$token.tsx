import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSharedInvoice } from "@/lib/invoices.functions";
import { INVOICE_STATUS_LABELS, fmtDate, inr, invoiceStatus } from "@/lib/crm-format";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export const Route = createFileRoute("/i/$token")({
  head: () => ({ meta: [{ title: "Your invoice | WebZaura" }, { name: "description", content: "An invoice from WebZaura." }, { property: "og:title", content: "Your invoice | WebZaura" }, { property: "og:description", content: "An invoice from WebZaura." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }, { name: "referrer", content: "no-referrer" }] }),
  component: SharedInvoice,
});

function SharedInvoice() {
  const { token } = Route.useParams();
  const valid = /^[a-f0-9]{48,96}$/.test(token);
  const { data, isLoading, isError } = useQuery({ queryKey: ["shared-invoice", token], queryFn: () => getSharedInvoice({ data: { token } }), enabled: valid, retry: false });
  return (
    <div className="min-h-[100svh]">
      <header className="container-x flex h-16 items-center justify-between"><Logo /><ThemeToggle /></header>
      <div className="container-x max-w-3xl py-12">
        {isLoading && valid ? <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-64 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>
          : !valid || isError || !data ? <><h1 className="text-heading">This link is not available.</h1><p className="mt-4 text-lg text-muted-foreground">It may have been replaced. Please ask WebZaura for a new link.</p></>
          : (() => {
            const { invoice: v, items } = data as any;
            const st = invoiceStatus(v);
            const balance = Number(v.total) - Number(v.paid_total);
            return (
              <>
                <p className="text-base">{"{"} Invoice {"}"}</p>
                <h1 className="mt-4 text-heading">{v.number}</h1>
                <p className="mt-4 text-lg text-muted-foreground">{v.clients?.company ? `Billed to ${v.clients.company}. ` : ""}Issued {fmtDate(v.issue_date)}{v.due_date ? `, due ${fmtDate(v.due_date)}` : ""}.</p>
                {v.clients?.gstin && <p className="text-base">GSTIN: {v.clients.gstin}</p>}
                <p className={`mt-6 text-lg font-semibold ${st === "overdue" ? "text-destructive" : ""}`}>Status: {INVOICE_STATUS_LABELS[st]} · Balance due {inr(balance)}</p>
                <ol className="mt-10 border-b border-border">
                  {items.map((it: any, i: number) => (
                    <li key={i} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[2rem_1fr_auto] sm:gap-4">
                      <span className="text-base text-muted-foreground">{i + 1}.</span>
                      <span className="text-base">{it.description}<span className="block text-muted-foreground">{Number(it.quantity)} × {inr(it.unit_price)}</span></span>
                      <span className="text-base sm:text-right">{inr(Math.max(Number(it.quantity) * Number(it.unit_price) - Number(it.item_discount), 0))}</span>
                    </li>
                  ))}
                </ol>
                <dl className="mt-6 ml-auto max-w-sm space-y-2 text-base">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{inr(v.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>{inr(v.discount_total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">GST ({Number(v.tax_rate)}%)</dt><dd>{inr(v.tax_total)}</dd></div>
                  <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Total</dt><dd>{inr(v.total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Paid</dt><dd>{inr(v.paid_total)}</dd></div>
                  <div className="flex justify-between text-lg font-semibold"><dt>Balance due</dt><dd>{inr(balance)}</dd></div>
                </dl>
                {v.notes && <><h2 className="mt-10 text-lg font-semibold">Notes</h2><p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{v.notes}</p></>}
              </>
            );
          })()}
      </div>
    </div>
  );
}
