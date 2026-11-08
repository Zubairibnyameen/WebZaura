import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { addLeadNote, assignLeadOwner, convertLeadToClient, deleteLead, getLead, getMyProfile, updateLeadDetails, updateLeadStatus } from "@/lib/leads.functions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, QUOTE_STATUS_LABELS, fmtDate, inr, isOverdue } from "@/lib/crm-format";
import { Eyebrow } from "@/components/sections/primitives";
import { Button } from "@/components/ui/button";
import { ErrorNote, field, labelCls } from "@/components/crm/ui";
import { useConfirm } from "@/components/crm/Confirm";
import { Comments } from "@/components/crm/Comments";


export const Route = createFileRoute("/_authenticated/app/leads/$id")({
  head: () => ({ meta: [{ title: "Lead | WebZaura" }, { name: "description", content: "Lead details for the WebZaura team." }, { property: "og:title", content: "Lead | WebZaura" }, { property: "og:description", content: "Lead details for WebZaura team members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: LeadDetail,
});

const actionText = (a: { action: string; details: any; actor_label?: string | null }) => {
  if (a.action === "status_change") return `Status changed from ${LEAD_STATUS_LABELS[a.details?.from] ?? a.details?.from} to ${LEAD_STATUS_LABELS[a.details?.to] ?? a.details?.to}`;
  if (a.action === "owner_change") return "Owner changed";
  if (a.action === "create") return "Lead created";
  return "Details updated";
};

function LeadDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["lead", id], queryFn: () => getLead({ data: { id } }) });
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const [note, setNote] = useState("");
  const [value, setValue] = useState("");
  const [follow, setFollow] = useState("");
  const [lost, setLost] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setValue(data.lead.expected_value != null ? String(data.lead.expected_value) : "");
    setFollow(data.lead.next_follow_up ?? "");
    setLost(data.lead.lost_reason ?? "");
  }, [data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["lead", id] }); qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["pipeline"] }); };
  const canManage = me?.role === "admin" || me?.role === "manager";

  if (isLoading) return <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-64 rounded-lg" /><div className="skeleton h-40 rounded-lg" /><div className="skeleton h-40 rounded-lg" /></div>;
  if (error || !data) return <div><ErrorNote onRetry={() => refetch()}>This lead could not be opened. It may not exist, or it is not assigned to you.</ErrorNote><Link to="/app/leads" className="ghost-link mt-4 inline-block underline">Back to leads</Link></div>;

  const { lead, notes, audits, owners, quotes, client } = data;
  const statusKey = LEAD_STATUSES.find((s) => LEAD_STATUS_LABELS[s] === LEAD_STATUS_LABELS[lead.status]) ?? "new";
  const overdue = isOverdue(lead.next_follow_up, lead.status);
  const timeline = [
    ...notes.map((n) => ({ id: n.id, at: n.created_at, kind: "Note", text: n.body })),
    ...audits.map((a) => ({ id: a.id, at: a.created_at, kind: a.actor_label ?? "Activity", text: actionText(a) })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, done: string) => {
    setBusy(true);
    const r = await fn().catch(() => ({ ok: false, error: "Something went wrong." }));
    setBusy(false);
    if (!r.ok) { toast.error(r.error ?? "Something went wrong."); return false; }
    toast.success(done); refresh(); return true;
  };

  const saveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const n = value.trim() === "" ? null : Number(value);
    if (n !== null && (Number.isNaN(n) || n < 0)) { toast.error("Expected value must be a positive number."); return; }
    run(() => updateLeadDetails({ data: { id, expectedValue: n, nextFollowUp: follow || null, lostReason: lost.trim() || null } }), "Details saved");
  };

  const convert = async () => {
    setBusy(true);
    const r = await convertLeadToClient({ data: { id } });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Client created");
    navigate({ to: "/app/clients/$id", params: { id: r.clientId } });
  };

  return (
    <div className="max-w-4xl">
      <Link to="/app/leads" className="ghost-link text-base text-muted-foreground">Back to leads</Link>
      <div className="mt-6"><Eyebrow>Lead</Eyebrow></div>
      <h1 className="mt-4 text-heading break-words">{lead.name}</h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/app/quotations/new" search={{ lead: lead.id }} className="pill">Create quotation</Link>
        {client ? <Link to="/app/clients/$id" params={{ id: client.id }} className="pill">Client: {client.company}</Link>
          : <Button variant="editorial" disabled={busy} onClick={convert}>Convert to client</Button>}
        {canManage && <Button variant="editorial" disabled={busy} className="text-destructive" onClick={async () => {
          if (!(await confirm({ title: "Delete this lead?" }))) return;
          const r = await deleteLead({ data: { id } });
          if (!r.ok) { toast.error(r.error); return; }
          toast.success("Lead deleted"); qc.invalidateQueries({ queryKey: ["leads"] }); navigate({ to: "/app/leads" });
        }}>Delete</Button>}
      </div>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        {([["Email", lead.email], ["Phone", lead.phone], ["Company", lead.company], ["Service interest", lead.service_interest], ["Type", lead.client_type], ["Source", lead.source === "website_form" ? "Website form" : lead.source], ["Received", fmtDate(lead.created_at)], ["Converted", lead.converted_at ? fmtDate(lead.converted_at) : null]] as const).map(([k, v]) => (
          <div key={k} className="bg-background p-5"><dt className="text-base text-muted-foreground">{k}</dt><dd className="mt-1 break-words text-lg">{v || "Not given"}</dd></div>
        ))}
      </dl>
      {lead.message && <p className="mt-6 max-w-2xl whitespace-pre-wrap text-lg text-muted-foreground">{lead.message}</p>}

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        <label className={labelCls}>Status
          <select value={statusKey} disabled={busy} onChange={(e) => run(() => updateLeadStatus({ data: { id, status: e.target.value as any } }), "Status updated")} className={field}>
            {LEAD_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{LEAD_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className={labelCls}>Owner
          <select value={lead.owner_id ?? ""} disabled={!canManage || busy} onChange={(e) => run(() => assignLeadOwner({ data: { id, ownerId: e.target.value || null } }), "Owner assigned")} className={field}>
            <option value="" className="bg-background">Unassigned</option>
            {owners.map((o) => <option key={o.id} value={o.id} className="bg-background">{o.full_name || o.email}</option>)}
          </select>
          {!canManage && <span className="mt-2 block text-base">Only admins and managers can reassign.</span>}
        </label>
      </div>

      <form onSubmit={saveDetails} className="mt-10 grid gap-8 sm:grid-cols-2">
        <label className={labelCls}>Expected value (INR)
          <input type="number" inputMode="decimal" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={field} />
        </label>
        <label className={labelCls}>Next follow-up
          <input type="date" value={follow} onChange={(e) => setFollow(e.target.value)} className={`${field} ${overdue ? "border-destructive" : ""}`} aria-describedby={overdue ? "overdue" : undefined} />
          {overdue && <span id="overdue" className="mt-2 block text-base text-destructive">Overdue since {fmtDate(lead.next_follow_up)}</span>}
        </label>
        {statusKey === "lost" && (
          <label className={`${labelCls} sm:col-span-2`}>Lost reason
            <input value={lost} maxLength={500} onChange={(e) => setLost(e.target.value)} className={field} />
          </label>
        )}
        <div><Button variant="editorial" type="submit" disabled={busy}>Save details</Button></div>
      </form>

      <h2 className="mt-14 text-heading font-semibold">Quotations</h2>
      {quotes.length === 0 ? <p className="mt-4 text-lg text-muted-foreground">No quotations for this lead yet.</p> : (
        <ul className="mt-4 border-b border-border">
          {quotes.map((q) => (
            <li key={q.id} className="border-t border-border">
              <Link to="/app/quotations/$id" params={{ id: q.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4">
                <span className="text-lg">{q.number}</span>
                <span className="text-base text-muted-foreground">{QUOTE_STATUS_LABELS[q.status]} · {inr(q.total)} · {fmtDate(q.issue_date)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Comments type="lead" id={id} />

      <h2 className="mt-14 text-heading font-semibold">Activity and notes</h2>
      <form className="mt-6" onSubmit={async (e) => {
        e.preventDefault();
        if (!note.trim()) return;
        if (await run(() => addLeadNote({ data: { leadId: id, body: note.trim() } }), "Note added")) setNote("");
      }}>
        <label htmlFor="note" className={labelCls}>Add a note</label>
        <textarea id="note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} className={field} />
        <Button variant="editorial" type="submit" disabled={busy || !note.trim()} className="mt-4">Save note</Button>
      </form>
      {timeline.length === 0 ? <p className="mt-6 text-lg text-muted-foreground">No activity yet.</p> : (
        <ol className="mt-8 border-b border-border">
          {timeline.map((t) => (
            <li key={t.id} className="grid gap-1 border-t border-border py-4 sm:grid-cols-[140px_1fr]">
              <span className="text-base text-muted-foreground">{fmtDate(t.at)} · {t.kind}</span>
              <span className="whitespace-pre-wrap text-base">{t.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
