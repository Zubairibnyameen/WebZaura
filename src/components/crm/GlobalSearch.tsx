import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { globalSearch } from "@/lib/crm.functions";
import { useDebounced } from "@/hooks/use-debounced";
import { field } from "./ui";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const dq = useDebounced(q.trim(), 250);
  const navigate = useNavigate();
  const { data = [], isFetching, isError } = useQuery({
    queryKey: ["search", dq],
    queryFn: () => globalSearch({ data: { q: dq } }),
    enabled: open && dq.length >= 2,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setActive(0), [dq]);

  const go = (r: (typeof data)[number]) => {
    setOpen(false);
    setQ("");
    if (r.kind === "Lead") navigate({ to: "/app/leads/$id", params: { id: r.id } });
    else if (r.kind === "Client") navigate({ to: "/app/clients/$id", params: { id: r.id } });
    else if (r.kind === "Project") navigate({ to: "/app/projects/$id", params: { id: r.id } });
    else if (r.kind === "Invoice") navigate({ to: "/app/invoices/$id", params: { id: r.id } });
    else navigate({ to: "/app/quotations/$id", params: { id: r.id } });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" className="ghost-link text-base text-muted-foreground" aria-keyshortcuts="Control+K Meta+K">
          Search<span className="ml-2 hidden text-muted-foreground lg:inline">Ctrl K</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-background/90" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-x-4 top-16 z-[61] mx-auto max-w-xl rounded-lg border border-border bg-background p-6">
          <Dialog.Title className="text-lg font-semibold">Search leads, clients, quotations, projects and invoices</Dialog.Title>
          <input
            autoFocus type="search" aria-label="Search" placeholder="Type at least 2 letters" value={q}
            role="combobox" aria-expanded={data.length > 0} aria-controls="search-results"
            aria-activedescendant={data[active] ? `sr-${active}` : undefined}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, data.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && data[active]) { e.preventDefault(); go(data[active]); }
            }}
            className={field}
          />
          <div aria-live="polite" className="sr-only">{dq.length >= 2 && !isFetching ? `${data.length} results` : ""}</div>
          <ul id="search-results" role="listbox" className="mt-4 max-h-[50vh] overflow-y-auto">
            {data.map((r, i) => (
              <li key={`${r.kind}-${r.id}`} id={`sr-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onClick={() => go(r)} onMouseEnter={() => setActive(i)}
                  className={`flex min-h-11 w-full items-center justify-between gap-4 border-t border-border py-3 text-left ${i === active ? "text-foreground" : "text-muted-foreground"}`}>
                  <span className="text-base">{r.label}{r.sub ? <span className="text-muted-foreground"> · {r.sub}</span> : null}</span>
                  <span className="text-base text-muted-foreground">{r.kind}</span>
                </button>
              </li>
            ))}
          </ul>
          {dq.length >= 2 && !isFetching && !isError && data.length === 0 && <p className="mt-4 text-base text-muted-foreground">Nothing matches that search.</p>}
          {isError && <p className="mt-4 text-base text-destructive">Search failed. Try again.</p>}
          <Dialog.Close asChild><Button variant="editorial" className="mt-6">Close</Button></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
