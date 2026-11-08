import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { exportLeadsCsv, getMyProfile, listLeads, listPipeline, updateLeadStatus } from "@/lib/leads.functions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, fmtDate, inr, isOverdue } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { DataRows, Empty, ErrorNote, ListSkeleton, PageHead, Pager, SearchBox, field, labelCls } from "@/components/crm/ui";
import { useDebounced } from "@/hooks/use-debounced";

export const Route = createFileRoute("/_authenticated/app/leads/")({
  head: () => ({ meta: [{ title: "Leads | WebZaura" }, { name: "description", content: "Leads for the WebZaura team." }, { property: "og:title", content: "Leads | WebZaura" }, { property: "og:description", content: "Leads for WebZaura team members." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: Leads,
});

type Sort = "created_at" | "name" | "next_follow_up" | "expected_value";

function Leads() {
  const [view, setView] = useState<"table" | "board">("table");
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const canExport = me?.role === "admin" || me?.role === "manager";
  const [exporting, setExporting] = useState(false);

  const doExport = async () => {
    setExporting(true);
    try {
      const csv = await exportLeadsCsv();
      const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = `webzaura-leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("The export failed. Try again."); }
    setExporting(false);
  };

  return (
    <div>
      <PageHead eyebrow="Leads" title="Every enquiry in one place." actions={
        <>
          <div role="group" aria-label="View" className="flex gap-2">
            <Button variant="editorial" aria-pressed={view === "table"} className={view === "table" ? "" : "text-muted-foreground"} onClick={() => setView("table")}>Table</Button>
            <Button variant="editorial" aria-pressed={view === "board"} className={view === "board" ? "" : "text-muted-foreground"} onClick={() => setView("board")}>Board</Button>
          </div>
          {canExport && <Button variant="editorial" disabled={exporting} onClick={doExport}>{exporting ? "Exporting..." : "Export CSV"}</Button>}
        </>
      } />
      {view === "table" ? <LeadTable /> : <Board />}
    </div>
  );
}

function LeadTable() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState<Sort>("created_at");
  const [page, setPage] = useState(1);
  const dq = useDebounced(q);
  const args = { q: dq || undefined, status: (status || undefined) as any, sort, dir: (sort === "name" || sort === "next_follow_up" ? "asc" : "desc") as "asc" | "desc", page };
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["leads", args], queryFn: () => listLeads({ data: args }), placeholderData: keepPreviousData });

  return (
    <>
      <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_200px_200px]">
        <SearchBox label="Search leads" value={q} onChange={(v) => { setQ(v); setPage(1); }} />
        <label className={labelCls}>Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={field}>
            <option value="" className="bg-background">All statuses</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{LEAD_STATUS_LABELS[s]}</option>)}
          </select>
        </label>
        <label className={labelCls}>Sort by
          <select value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }} className={field}>
            <option value="created_at" className="bg-background">Newest</option>
            <option value="name" className="bg-background">Name</option>
            <option value="next_follow_up" className="bg-background">Next follow-up</option>
            <option value="expected_value" className="bg-background">Expected value</option>
          </select>
        </label>
      </div>
      {isLoading ? <ListSkeleton /> : error ? <ErrorNote onRetry={() => refetch()}>Leads could not be loaded.</ErrorNote> :
        !data?.rows.length ? <Empty>{dq || status ? "No leads match these filters." : "No enquiries yet. New ones from the contact form will appear here."}</Empty> : (
          <>
            <DataRows
              rows={data.rows}
              rowKey={(l) => l.id}
              renderLink={(l, c) => <Link to="/app/leads/$id" params={{ id: l.id }} className="ghost-link block">{c}</Link>}
              columns={[
                { label: "Name", cell: (l) => <>{l.name}{l.company ? <span className="text-muted-foreground"> · {l.company}</span> : null}</> },
                { label: "Service", cell: (l) => l.service_interest ?? "General" },
                { label: "Status", cell: (l) => LEAD_STATUS_LABELS[l.status] ?? l.status },
                { label: "Follow-up", cell: (l) => isOverdue(l.next_follow_up, l.status) ? <span className="text-destructive">Overdue · {fmtDate(l.next_follow_up)}</span> : fmtDate(l.next_follow_up) },
                { label: "Value", cell: (l) => inr(l.expected_value) },
              ]}
            />
            <Pager page={page} count={data.count} onPage={setPage} />
          </>
        )}
    </>
  );
}

type Card = Awaited<ReturnType<typeof listPipeline>>[number];

function Board() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["pipeline"], queryFn: () => listPipeline() });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));

  const move = async (id: string, status: (typeof LEAD_STATUSES)[number]) => {
    const prev = qc.getQueryData<Card[]>(["pipeline"]);
    qc.setQueryData<Card[]>(["pipeline"], (d) => d?.map((l) => (l.id === id ? { ...l, status } : l)));
    const r = await updateLeadStatus({ data: { id, status } });
    if (!r.ok) { qc.setQueryData(["pipeline"], prev); toast.error(r.error); return; }
    toast.success(`Moved to ${LEAD_STATUS_LABELS[status]}`);
    qc.invalidateQueries({ queryKey: ["leads"] });
  };
  const onDragEnd = (e: DragEndEvent) => {
    const to = e.over?.id as (typeof LEAD_STATUSES)[number] | undefined;
    const card = data?.find((l) => l.id === e.active.id);
    if (to && card && card.status !== to) move(card.id, to);
  };

  if (isLoading) return <ListSkeleton rows={3} />;
  if (error || !data) return <ErrorNote onRetry={() => refetch()}>The board could not be loaded.</ErrorNote>;
  if (!data.length) return <Empty>No leads yet.</Empty>;

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <p className="mt-6 text-base text-muted-foreground">Drag a card to another column, or use the status menu on each card.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {LEAD_STATUSES.map((s) => (
          <Column key={s} status={s} cards={data.filter((l) => (LEAD_STATUS_LABELS[l.status] ?? "") === LEAD_STATUS_LABELS[s])} onMove={move} />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ status, cards, onMove }: { status: (typeof LEAD_STATUSES)[number]; cards: Card[]; onMove: (id: string, s: (typeof LEAD_STATUSES)[number]) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} aria-label={`${LEAD_STATUS_LABELS[status]}, ${cards.length} leads`} className={`min-h-32 rounded-lg border p-3 ${isOver ? "border-foreground" : "border-border"}`}>
      <h2 className="flex justify-between text-base font-semibold"><span>{LEAD_STATUS_LABELS[status]}</span><span className="text-muted-foreground">{cards.length}</span></h2>
      <ul className="mt-3 space-y-3">{cards.map((c) => <BoardCard key={c.id} card={c} onMove={onMove} />)}</ul>
    </section>
  );
}

function BoardCard({ card, onMove }: { card: Card; onMove: (id: string, s: (typeof LEAD_STATUSES)[number]) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <li ref={setNodeRef} style={style} className={`rounded-lg border border-border bg-background p-3 ${isDragging ? "relative z-10 opacity-80" : ""}`}>
      <div {...listeners} {...attributes} aria-label={`Drag ${card.name}`} aria-roledescription="draggable lead" className="cursor-grab touch-none">
        <Link to="/app/leads/$id" params={{ id: card.id }} className="ghost-link block text-base font-semibold">{card.name}</Link>
        <p className="text-base text-muted-foreground">{card.service_interest ?? "General"}</p>
        {card.expected_value != null && <p className="text-base">{inr(card.expected_value)}</p>}
        {isOverdue(card.next_follow_up, card.status) && <p className="text-base text-destructive">Follow-up overdue</p>}
      </div>
      <label className="mt-2 block text-base text-muted-foreground">Status
        <select value={LEAD_STATUSES.find((s) => LEAD_STATUS_LABELS[s] === LEAD_STATUS_LABELS[card.status]) ?? "new"} onChange={(e) => onMove(card.id, e.target.value as any)} className="mt-1 w-full border-0 border-b border-border bg-transparent py-2 text-base text-foreground outline-none focus:border-foreground">
          {LEAD_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{LEAD_STATUS_LABELS[s]}</option>)}
        </select>
      </label>
    </li>
  );
}
