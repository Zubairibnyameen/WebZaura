import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/sections/primitives";
import { PAGE_SIZE } from "@/lib/crm-format";

export const field =
  "mt-2 w-full border-0 border-b border-border bg-transparent px-0 py-3 text-base text-foreground outline-none focus:border-foreground disabled:opacity-60";
export const labelCls = "block text-base text-muted-foreground";

export function PageHead({ eyebrow, title, actions }: { eyebrow: string; title: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-4 text-heading">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mt-8 space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="mt-10 text-lg text-muted-foreground">{children}</p>;
}

export function ErrorNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="mt-10" role="alert">
      <p className="text-lg text-muted-foreground">{children}</p>
      {onRetry && <Button variant="editorial" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Pager({ page, count, onPage }: { page: number; count: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (count <= PAGE_SIZE) return <p className="mt-6 text-base text-muted-foreground">{count} {count === 1 ? "record" : "records"}</p>;
  return (
    <nav aria-label="Pages" className="mt-6 flex flex-wrap items-center gap-4">
      <Button variant="editorial" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
      <span className="text-base text-muted-foreground" aria-live="polite">Page {page} of {pages} · {count} records</span>
      <Button variant="editorial" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button>
    </nav>
  );
}

/** Hairline table on desktop, stacked label/value cards on phones. */
export function DataRows<T>({
  rows, columns, rowKey, renderLink,
}: {
  rows: T[];
  columns: { label: string; cell: (r: T) => ReactNode; className?: string }[];
  rowKey: (r: T) => string;
  renderLink: (r: T, children: ReactNode) => ReactNode;
}) {
  const grid = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` };
  return (
    <div className="mt-8">
      <div className="hidden gap-6 pb-3 text-base text-muted-foreground lg:grid" style={grid} aria-hidden="true">
        {columns.map((c) => <span key={c.label}>{c.label}</span>)}
      </div>
      <ul className="border-b border-border">
        {rows.map((r) => (
          <li key={rowKey(r)} className="border-t border-border">
            {renderLink(r,
              <span className="grid gap-2 py-4 lg:items-center lg:gap-6 lg:[grid-template-columns:var(--cols)]" style={{ ["--cols" as string]: grid.gridTemplateColumns }}>
                {columns.map((c, i) => (
                  <span key={c.label} className={`grid grid-cols-[8rem_1fr] gap-3 lg:block ${i === 0 ? "text-lg" : "text-base"} ${c.className ?? ""}`}>
                    <span className="text-muted-foreground lg:hidden">{c.label}</span>
                    <span className="min-w-0 break-words">{c.cell(r)}</span>
                  </span>
                ))}
              </span>,
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SearchBox({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className={labelCls}>
      {label}
      <input type="search" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} className={field} />
    </label>
  );
}
