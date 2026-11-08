import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { getSharedQuotation, respondToSharedQuotation } from "@/lib/crm.functions";
import { QUOTE_STATUS_LABELS, fmtDate, inr } from "@/lib/crm-format";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/q/$token")({
  head: () => ({ meta: [{ title: "Your quotation | WebZaura" }, { name: "description", content: "A quotation prepared by WebZaura." }, { property: "og:title", content: "Your quotation | WebZaura" }, { property: "og:description", content: "A quotation prepared by WebZaura." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex, nofollow" }, { name: "referrer", content: "no-referrer" }] }),
  component: SharedQuote,
});

function SharedQuote() {
  const { token } = Route.useParams();
  const qc = useQueryClient();
  const valid = /^[a-f0-9]{48,96}$/.test(token);
  const { data, isLoading, isError } = useQuery({ queryKey: ["shared", token], queryFn: () => getSharedQuotation({ data: { token } }), enabled: valid, retry: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const respond = async (accept: boolean) => {
    if (!window.confirm(accept ? "Accept this quotation?" : "Decline this quotation?")) return;
    setBusy(true);
    const r = await respondToSharedQuotation({ data: { token, accept } }).catch(() => ({ ok: false as const, error: "Your response could not be saved. Please try again." }));
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: accept ? "Thank you. The quotation is accepted and WebZaura will be in touch." : "Thank you. We have recorded that you declined." } : { ok: false, text: r.error });
    qc.invalidateQueries({ queryKey: ["shared", token] });
  };

  return (
    <div className="min-h-[100svh]">
      <header className="container-x flex h-16 items-center justify-between"><Logo /><ThemeToggle /></header>
      <div className="container-x max-w-3xl py-12">
        {isLoading && valid ? <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-64 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>
          : !valid || isError || !data ? (
            <><h1 className="text-heading">This link is not available.</h1><p className="mt-4 text-lg text-muted-foreground">It may have been replaced. Please ask WebZaura for a new link.</p></>
          ) : (() => {
            const { quote: q, items } = data as any;
            const to = q.clients?.company ?? q.leads?.company ?? q.leads?.name;
            const open = q.status === "sent" || q.status === "draft";
            return (
              <>
                <p className="text-base">{"{"} Quotation {"}"}</p>
                <h1 className="mt-4 text-heading">{q.number}</h1>
                <p className="mt-4 text-lg text-muted-foreground">{to ? `Prepared for ${to}. ` : ""}Issued {fmtDate(q.issue_date)}{q.valid_until ? `, valid until ${fmtDate(q.valid_until)}` : ""}. Status: {QUOTE_STATUS_LABELS[q.status]}.</p>
                <ol className="mt-10 border-b border-border">
                  {items.map((it: any, i: number) => (
                    <li key={i} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[2rem_1fr_auto] sm:gap-4">
                      <span className="text-base text-muted-foreground">{i + 1}.</span>
                      <span className="text-base">{it.description}<span className="block text-muted-foreground">{Number(it.quantity)} × {inr(it.unit_price)}{Number(it.item_discount) ? ` less ${inr(it.item_discount)}` : ""}</span></span>
                      <span className="text-base sm:text-right">{inr(Math.max(Number(it.quantity) * Number(it.unit_price) - Number(it.item_discount), 0))}</span>
                    </li>
                  ))}
                </ol>
                <dl className="mt-6 ml-auto max-w-sm space-y-2 text-base">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{inr(q.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">Discount</dt><dd>{inr(q.discount_total)}</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">GST ({Number(q.tax_rate)}%)</dt><dd>{inr(q.tax_total)}</dd></div>
                  <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold"><dt>Total</dt><dd>{inr(q.total)}</dd></div>
                </dl>
                {q.notes && <><h2 className="mt-10 text-lg font-semibold">Notes</h2><p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{q.notes}</p></>}
                {q.terms && <><h2 className="mt-6 text-lg font-semibold">Terms</h2><p className="mt-2 whitespace-pre-wrap text-base text-muted-foreground">{q.terms}</p></>}
                {msg && <p role="status" className={`mt-10 text-lg ${msg.ok ? "" : "text-destructive"}`}>{msg.text}</p>}
                {open && !msg?.ok && (
                  <div className="mt-10 flex flex-wrap gap-3">
                    <Button variant="editorial" disabled={busy} onClick={() => respond(true)}>Accept quotation</Button>
                    <Button variant="editorial" disabled={busy} className="text-muted-foreground" onClick={() => respond(false)}>Decline</Button>
                  </div>
                )}
              </>
            );
          })()}
      </div>
    </div>
  );
}
