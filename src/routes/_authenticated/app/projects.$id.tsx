import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { createFileUpload, deleteFile, deleteProject, deleteTask, fileDownloadUrl, getProject, registerFile, saveTask, setTaskStatus } from "@/lib/projects.functions";
import { listInvoices } from "@/lib/invoices.functions";
import { getMyProfile } from "@/lib/leads.functions";
import { ALLOWED_FILE_TYPES, INVOICE_STATUS_LABELS, MAX_FILE_BYTES, PROJECT_STATUS_LABELS, TASK_STATUSES, TASK_STATUS_LABELS, fmtDate, inr, invoiceStatus, todayISO } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { ErrorNote, PageHead, field, labelCls } from "@/components/crm/ui";
import { ProjectForm } from "@/components/crm/ProjectForm";
import { Comments } from "@/components/crm/Comments";
import { useConfirm } from "@/components/crm/Confirm";

export const Route = createFileRoute("/_authenticated/app/projects/$id")({
  head: () => ({ meta: [{ title: "Project | WebZaura" }, { name: "description", content: "Project workspace." }, { property: "og:title", content: "Project | WebZaura" }, { property: "og:description", content: "Project workspace." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: ProjectPage,
});

type Data = Awaited<ReturnType<typeof getProject>>;
type Task = Data["tasks"][number];
type TaskStatus = (typeof TASK_STATUSES)[number];
const taskOverdue = (t: Task) => t.status !== "done" && !!t.due_date && t.due_date < todayISO();

function ProjectPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["project", id], queryFn: () => getProject({ data: { id } }) });
  const { data: me } = useQuery({ queryKey: ["my-profile"], queryFn: () => getMyProfile() });
  const staff = me?.role === "admin" || me?.role === "manager";
  const tabs = ["Overview", "Tasks", "Files", "Comments", ...(staff ? ["Invoices"] : [])];
  const [tab, setTab] = useState("Overview");
  const [editing, setEditing] = useState(false);

  if (isLoading) return <div className="space-y-4" aria-busy="true"><div className="skeleton h-10 w-64 rounded-lg" /><div className="skeleton h-64 rounded-lg" /></div>;
  if (error || !data) return <div><ErrorNote onRetry={() => refetch()}>This project could not be opened. You may not be a member of it.</ErrorNote><Link to="/app/projects" className="ghost-link mt-4 inline-block underline">Back to projects</Link></div>;
  const { project: p, memberIds, people } = data as any;
  const nameOf = (uid: string | null) => people.find((x: any) => x.id === uid)?.full_name || people.find((x: any) => x.id === uid)?.email || "Unassigned";
  const refresh = () => qc.invalidateQueries({ queryKey: ["project", id] });

  return (
    <div className="max-w-6xl">
      <Link to="/app/projects" className="ghost-link text-base text-muted-foreground">Back to projects</Link>
      <div className="mt-6"><PageHead eyebrow={`Project · ${PROJECT_STATUS_LABELS[p.status]}`} title={p.name} actions={staff && (
        <>
          <Link to="/app/invoices/new" search={{ project: p.id }} className="pill">Create invoice</Link>
          <Button variant="editorial" className="text-destructive" onClick={async () => {
            if (!(await confirm({ title: "Delete this project?", body: "Its tasks and files are deleted too. This cannot be undone." }))) return;
            const r = await deleteProject({ data: { id } });
            if (!r.ok) { toast.error(r.error); return; }
            toast.success("Project deleted"); qc.invalidateQueries({ queryKey: ["projects"] }); navigate({ to: "/app/projects" });
          }}>Delete</Button>
        </>
      )} /></div>

      <div role="tablist" aria-label="Project sections" className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-b border-border">
        {tabs.map((t) => (
          <button key={t} role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} onClick={() => setTab(t)}
            className={`min-h-11 border-b-2 pb-2 text-base ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground"}`}>{t}</button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-8">
        {tab === "Overview" && (editing ? (
          <ProjectForm initial={{ ...p, memberIds }} onSaved={() => { setEditing(false); refresh(); qc.invalidateQueries({ queryKey: ["projects"] }); }} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              {([
                ["Client", p.clients ? <Link to="/app/clients/$id" params={{ id: p.clients.id }} className="ghost-link underline">{p.clients.company}</Link> : "Not set"],
                ["Quotation", p.quotations ? <Link to="/app/quotations/$id" params={{ id: p.quotations.id }} className="ghost-link underline">{p.quotations.number}</Link> : "None"],
                ["Service type", p.service_type || "Not set"], ["Status", PROJECT_STATUS_LABELS[p.status]],
                ["Start", fmtDate(p.start_date)], ["Due", fmtDate(p.due_date)],
                ["Team", memberIds.length ? memberIds.map(nameOf).join(", ") : "No members yet"], ["Description", p.description || "None"],
              ] as const).map(([k, v]) => (
                <div key={k} className="bg-background p-5"><dt className="text-base text-muted-foreground">{k}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-lg">{v}</dd></div>
              ))}
            </dl>
            {staff && <Button variant="editorial" className="mt-6" onClick={() => setEditing(true)}>Edit project</Button>}
          </>
        ))}
        {tab === "Tasks" && <Tasks data={data} staff={staff} myId={me?.profile?.id ?? ""} nameOf={nameOf} refresh={refresh} />}
        {tab === "Files" && <Files projectId={id} files={data.files} staff={staff} nameOf={nameOf} refresh={refresh} />}
        {tab === "Comments" && <Comments type="project" id={id} />}
        {tab === "Invoices" && staff && <ProjectInvoices projectId={id} />}
      </div>
    </div>
  );
}

function Tasks({ data, staff, myId, nameOf, refresh }: { data: Data; staff: boolean; myId: string; nameOf: (u: string | null) => string; refresh: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [view, setView] = useState<"board" | "list">("board");
  const [form, setForm] = useState<Partial<Task> | null>(null);
  const key = ["project", data.project.id];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const canEdit = (t: Task) => staff || t.assignee_id === myId;

  const move = async (t: Task, status: TaskStatus) => {
    if (!canEdit(t)) { toast.error("You can only move tasks assigned to you."); return; }
    const prev = qc.getQueryData<Data>(key);
    qc.setQueryData<Data>(key, (d) => d && { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) });
    const r = await setTaskStatus({ data: { id: t.id, status } });
    if (!r.ok) { qc.setQueryData(key, prev); toast.error(r.error); return; }
    toast.success(`Moved to ${TASK_STATUS_LABELS[status]}`);
  };
  const onDragEnd = (e: DragEndEvent) => {
    const t = data.tasks.find((x) => x.id === e.active.id);
    const to = e.over?.id as TaskStatus | undefined;
    if (t && to && t.status !== to) move(t, to);
  };

  const statusSelect = (t: Task) => (
    <label className="block text-base text-muted-foreground">Status
      <select value={t.status} disabled={!canEdit(t)} onChange={(e) => move(t, e.target.value as TaskStatus)} className="mt-1 w-full border-0 border-b border-border bg-transparent py-2 text-base text-foreground outline-none focus:border-foreground disabled:opacity-60">
        {TASK_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{TASK_STATUS_LABELS[s]}</option>)}
      </select>
    </label>
  );
  const meta = (t: Task) => (
    <p className="text-base text-muted-foreground">{nameOf(t.assignee_id)}{t.due_date ? <> · {taskOverdue(t) ? <span className="text-destructive">Overdue {fmtDate(t.due_date)}</span> : `Due ${fmtDate(t.due_date)}`}</> : null}</p>
  );
  const actions = (t: Task) => (
    <div className="mt-2 flex gap-4">
      {canEdit(t) && <Button variant="ghost" className="ghost-link h-auto p-0 text-base underline" onClick={() => setForm(t)}>Edit</Button>}
      {staff && <Button variant="ghost" className="ghost-link h-auto p-0 text-base text-muted-foreground underline" onClick={async () => {
        if (!(await confirm({ title: `Delete task "${t.title}"?` }))) return;
        const r = await deleteTask({ data: { id: t.id } }); if (!r.ok) toast.error(r.error); else refresh();
      }}>Delete</Button>}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        <div role="group" aria-label="Task view" className="flex gap-2">
          <Button variant="editorial" aria-pressed={view === "board"} className={view === "board" ? "" : "text-muted-foreground"} onClick={() => setView("board")}>Board</Button>
          <Button variant="editorial" aria-pressed={view === "list"} className={view === "list" ? "" : "text-muted-foreground"} onClick={() => setView("list")}>List</Button>
        </div>
        {staff && <Button variant="editorial" onClick={() => setForm({ status: "todo" })}>Add task</Button>}
      </div>
      {form && <TaskForm task={form} projectId={data.project.id} staff={staff} memberIds={(data as any).memberIds} nameOf={nameOf} onDone={() => { setForm(null); refresh(); }} />}
      {data.tasks.length === 0 ? <p className="mt-8 text-lg text-muted-foreground">No tasks yet.</p> : view === "board" ? (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <p className="mt-6 text-base text-muted-foreground">Drag a task to another column, or use its status menu.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {TASK_STATUSES.map((s) => (
              <TaskColumn key={s} status={s} count={data.tasks.filter((t) => t.status === s).length}>
                {data.tasks.filter((t) => t.status === s).map((t) => (
                  <TaskCard key={t.id} task={t} disabled={!canEdit(t)}>
                    <p className="text-base font-semibold">{t.title}</p>{meta(t)}{statusSelect(t)}{actions(t)}
                  </TaskCard>
                ))}
              </TaskColumn>
            ))}
          </div>
        </DndContext>
      ) : (
        <ul className="mt-8 border-b border-border">
          {data.tasks.map((t) => (
            <li key={t.id} className="grid gap-3 border-t border-border py-4 md:grid-cols-[1fr_200px] md:items-start">
              <div><p className="text-lg">{t.title}</p>{meta(t)}{t.description && <p className="mt-1 whitespace-pre-wrap text-base text-muted-foreground">{t.description}</p>}{actions(t)}</div>
              {statusSelect(t)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskColumn({ status, count, children }: { status: TaskStatus; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} aria-label={`${TASK_STATUS_LABELS[status]}, ${count} tasks`} className={`min-h-32 rounded-lg border p-3 ${isOver ? "border-foreground" : "border-border"}`}>
      <h3 className="flex justify-between text-base font-semibold"><span>{TASK_STATUS_LABELS[status]}</span><span className="text-muted-foreground">{count}</span></h3>
      <ul className="mt-3 space-y-3">{children}</ul>
    </section>
  );
}

function TaskCard({ task, disabled, children }: { task: Task; disabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled });
  return (
    <li ref={setNodeRef} style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={`rounded-lg border bg-background p-3 ${taskOverdue(task) ? "border-destructive" : "border-border"} ${isDragging ? "relative z-10 opacity-80" : ""}`}>
      {!disabled && <div {...listeners} {...attributes} aria-label={`Drag ${task.title}`} aria-roledescription="draggable task" className="mb-2 h-3 cursor-grab touch-none rounded bg-card" />}
      {children}
    </li>
  );
}

function TaskForm({ task, projectId, staff, memberIds, nameOf, onDone }: { task: Partial<Task>; projectId: string; staff: boolean; memberIds: string[]; nameOf: (u: string | null) => string; onDone: () => void }) {
  const [f, setF] = useState({ title: task.title ?? "", description: task.description ?? "", assignee_id: task.assignee_id ?? "", due_date: task.due_date ?? "", status: (task.status ?? "todo") as TaskStatus });
  const [busy, setBusy] = useState(false);
  return (
    <form className="mt-6 grid gap-6 rounded-lg border border-border p-6 sm:grid-cols-2" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const r = await saveTask({ data: { id: task.id, project_id: projectId, title: f.title, description: f.description || null, assignee_id: f.assignee_id || null, due_date: f.due_date || null, status: f.status } })
        .catch(() => ({ ok: false as const, error: "Check the fields and try again." }));
      setBusy(false);
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("Task saved"); onDone();
    }}>
      <label className={labelCls}>Title<input required maxLength={300} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={field} /></label>
      <label className={labelCls}>Assignee
        <select value={f.assignee_id} disabled={!staff} onChange={(e) => setF({ ...f, assignee_id: e.target.value })} className={field}>
          <option value="" className="bg-background">Unassigned</option>
          {memberIds.map((m) => <option key={m} value={m} className="bg-background">{nameOf(m)}</option>)}
        </select>
        {staff && memberIds.length === 0 && <span className="mt-2 block text-base">Add team members in Overview to assign tasks.</span>}
      </label>
      <label className={labelCls}>Due date<input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} className={field} /></label>
      <label className={labelCls}>Status
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as TaskStatus })} className={field}>
          {TASK_STATUSES.map((s) => <option key={s} value={s} className="bg-background">{TASK_STATUS_LABELS[s]}</option>)}
        </select>
      </label>
      <label className={`${labelCls} sm:col-span-2`}>Description<textarea rows={2} maxLength={4000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={field} /></label>
      <div className="flex gap-3 sm:col-span-2"><Button variant="editorial" type="submit" disabled={busy}>Save task</Button><Button variant="editorial" type="button" className="text-muted-foreground" onClick={onDone}>Cancel</Button></div>
    </form>
  );
}

const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);

function Files({ projectId, files, staff, nameOf, refresh }: { projectId: string; files: Data["files"]; staff: boolean; nameOf: (u: string | null) => string; refresh: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) { toast.error("Files can be up to 10 MB."); return; }
    if (!ALLOWED_FILE_TYPES[file.type]) { toast.error("This file type is not allowed. Use PDF, images, Office documents, text, CSV or ZIP."); return; }
    setBusy(true);
    try {
      const s = await createFileUpload({ data: { projectId, fileName: file.name, size: file.size, mime: file.type } });
      if (!s.ok) { toast.error(s.error); return; }
      const { error } = await supabase.storage.from("project-files").uploadToSignedUrl(s.path, s.token, file, { contentType: file.type });
      if (error) { toast.error("The upload failed."); return; }
      const r = await registerFile({ data: { projectId, path: s.path, fileName: file.name, size: file.size, mime: file.type } });
      if (!r.ok) { toast.error(r.error); return; }
      toast.success("File uploaded"); refresh();
    } catch { toast.error("The upload failed."); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  };
  return (
    <div>
      <label className={labelCls}>Upload a file (up to 10 MB: PDF, images, Office documents, text, CSV, ZIP)
        <input ref={input} type="file" disabled={busy} accept={Object.keys(ALLOWED_FILE_TYPES).join(",")} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="mt-3 block w-full text-base file:mr-4 file:rounded-full file:border file:border-border file:bg-transparent file:px-4 file:py-2 file:text-foreground" />
      </label>
      {busy && <p className="mt-3 text-base" role="status">Uploading...</p>}
      {files.length === 0 ? <p className="mt-8 text-lg text-muted-foreground">No files yet.</p> : (
        <ul className="mt-8 border-b border-border">
          {files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-4">
              <span className="min-w-0 break-words text-base">{f.file_name}<span className="block text-muted-foreground">{kb(f.size)} · {nameOf(f.uploaded_by)} · {fmtDate(f.created_at)}</span></span>
              <span className="flex gap-3">
                <Button variant="editorial" onClick={async () => { const r = await fileDownloadUrl({ data: { id: f.id } }); if (!r.ok) toast.error(r.error); else window.location.assign(r.url); }}>Download</Button>
                {staff && <Button variant="editorial" className="text-destructive" onClick={async () => {
                  if (!(await confirm({ title: `Delete ${f.file_name}?` }))) return;
                  const r = await deleteFile({ data: { id: f.id } }); if (!r.ok) toast.error(r.error); else { toast.success("File deleted"); refresh(); }
                }}>Delete</Button>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ProjectInvoices({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["invoices", { projectId }], queryFn: () => listInvoices({ data: { projectId, page: 1 } }) });
  if (isLoading) return <div className="skeleton h-24 rounded-lg" />;
  if (!data?.rows.length) return <p className="text-lg text-muted-foreground">No invoices for this project yet.</p>;
  return (
    <ul className="border-b border-border">
      {data.rows.map((i: any) => (
        <li key={i.id} className="border-t border-border"><Link to="/app/invoices/$id" params={{ id: i.id }} className="ghost-link flex flex-wrap justify-between gap-2 py-4"><span className="text-lg">{i.number}</span><span className="text-base text-muted-foreground">{INVOICE_STATUS_LABELS[invoiceStatus(i)]} · {inr(i.total)} · balance {inr(Number(i.total) - Number(i.paid_total))}</span></Link></li>
      ))}
    </ul>
  );
}
