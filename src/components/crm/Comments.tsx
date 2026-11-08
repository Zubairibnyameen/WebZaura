import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addComment, deleteComment, editComment, listComments } from "@/lib/activity.functions";
import { listMentionables } from "@/lib/projects.functions";
import { fmtDate, handleOf } from "@/lib/crm-format";
import { Button } from "@/components/ui/button";
import { field, labelCls } from "./ui";
import { useConfirm } from "./Confirm";

type Entity = "lead" | "client" | "project" | "quotation" | "invoice";

function renderBody(body: string, handles: Set<string>): ReactNode[] {
  return body.split(/(@[\p{L}\p{N}._-]+)/u).map((part, i) =>
    part.startsWith("@") && handles.has(part.slice(1).toLowerCase())
      ? <mark key={i} className="rounded bg-foreground px-1 text-background">{part}</mark>
      : <span key={i}>{part}</span>);
}

export function Comments({ type, id }: { type: Entity; id: string }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const key = ["comments", type, id];
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: key, queryFn: () => listComments({ data: { type, id } }) });
  const { data: team = [] } = useQuery({ queryKey: ["mentionables"], queryFn: () => listMentionables(), staleTime: 300000 });
  const handles = useMemo(() => new Set(team.map((t) => handleOf(t))), [team]);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ch = supabase.channel(`comments-${type}-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `entity_id=eq.${id}` }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id]);

  const mentionQuery = body.match(/@([\p{L}\p{N}._-]*)$/u)?.[1]?.toLowerCase();
  const suggestions = mentionQuery !== undefined ? team.filter((t) => handleOf(t).startsWith(mentionQuery)).slice(0, 5) : [];

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const r = await addComment({ data: { type, id, body: body.trim() } }).catch(() => ({ ok: false as const, error: "Could not post the comment." }));
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    setBody(""); qc.invalidateQueries({ queryKey: key });
  };

  return (
    <section aria-labelledby={`c-${id}`} className="mt-14">
      <h2 id={`c-${id}`} className="text-heading font-semibold">Comments</h2>
      {isLoading ? <div className="skeleton mt-6 h-24 rounded-lg" aria-busy="true" /> : isError ? (
        <p className="mt-4 text-base text-muted-foreground" role="alert">Comments could not be loaded. <Button variant="ghost" className="underline" onClick={() => refetch()}>Try again</Button></p>
      ) : data.length === 0 ? <p className="mt-4 text-lg text-muted-foreground">No comments yet.</p> : (
        <ol className="mt-6 border-b border-border" aria-live="polite">
          {data.map((c) => (
            <li key={c.id} className="border-t border-border py-4">
              <p className="text-base text-muted-foreground">{c.author} · <time dateTime={c.created_at}>{fmtDate(c.created_at)} {new Date(c.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</time>{c.updated_at !== c.created_at ? " · edited" : ""}</p>
              {editing?.id === c.id ? (
                <form className="mt-2" onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await editComment({ data: { id: c.id, body: editing.body } });
                  if (!r.ok) { toast.error(r.error); return; }
                  setEditing(null); qc.invalidateQueries({ queryKey: key });
                }}>
                  <label className="sr-only" htmlFor={`e-${c.id}`}>Edit comment</label>
                  <textarea id={`e-${c.id}`} rows={2} maxLength={4000} value={editing.body} onChange={(e) => setEditing({ id: c.id, body: e.target.value })} className={field} />
                  <div className="mt-2 flex gap-3"><Button variant="editorial" type="submit">Save</Button><Button variant="editorial" type="button" className="text-muted-foreground" onClick={() => setEditing(null)}>Cancel</Button></div>
                </form>
              ) : <p className="mt-1 whitespace-pre-wrap break-words text-base">{renderBody(c.body, handles)}</p>}
              {c.mine && editing?.id !== c.id && (
                <div className="mt-2 flex gap-4">
                  <Button variant="ghost" className="ghost-link h-auto p-0 text-base text-muted-foreground underline" onClick={() => setEditing({ id: c.id, body: c.body })}>Edit</Button>
                  {c.canDelete && <Button variant="ghost" className="ghost-link h-auto p-0 text-base text-muted-foreground underline" onClick={async () => {
                    if (!(await confirm({ title: "Delete this comment?" }))) return;
                    const r = await deleteComment({ data: { id: c.id } });
                    if (!r.ok) toast.error(r.error); else qc.invalidateQueries({ queryKey: key });
                  }}>Delete</Button>}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={post} className="relative mt-6">
        <label htmlFor={`new-${id}`} className={labelCls}>Add a comment. Type @ to mention a teammate.</label>
        <textarea id={`new-${id}`} rows={3} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} className={field} />
        {suggestions.length > 0 && (
          <ul aria-label="Mention suggestions" className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((t) => (
              <li key={t.id}><Button type="button" variant="editorial" onClick={() => setBody(body.replace(/@[\p{L}\p{N}._-]*$/u, `@${handleOf(t)} `))}>@{handleOf(t)} <span className="text-muted-foreground">{t.full_name}</span></Button></li>
            ))}
          </ul>
        )}
        <Button variant="editorial" type="submit" disabled={busy || !body.trim()} className="mt-4">Post comment</Button>
      </form>
    </section>
  );
}
