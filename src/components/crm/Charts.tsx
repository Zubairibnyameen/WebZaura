import { useState } from "react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/crm-format";

/** Lightweight bar chart with a text summary and a data-table toggle. */
export function BarChart({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((a, d) => a + d.value, 0);
  const top = data.reduce((a, d) => (d.value > a.value ? d : a), data[0] ?? { label: "", value: 0 });
  const summary = total === 0 ? `${title}: no payments recorded yet.` : `${title}: total ${inr(total)}. Highest is ${top.label} at ${inr(top.value)}.`;
  return (
    <figure className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <figcaption className="text-base text-muted-foreground">{summary}</figcaption>
        <Button variant="editorial" aria-pressed={table} onClick={() => setTable(!table)}>{table ? "Show chart" : "Show table"}</Button>
      </div>
      {table ? (
        <table className="mt-4 w-full text-left text-base">
          <caption className="sr-only">{title}</caption>
          <thead><tr className="border-b border-border"><th scope="col" className="py-2 font-semibold">Item</th><th scope="col" className="py-2 text-right font-semibold">Amount</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.label} className="border-b border-border"><th scope="row" className="py-2 font-normal">{d.label}</th><td className="py-2 text-right">{inr(d.value)}</td></tr>)}</tbody>
        </table>
      ) : (
        <div className="mt-4 overflow-x-auto" aria-hidden="true">
          <div className="flex h-48 min-w-[480px] items-end gap-2 border-b border-border">
            {data.map((d) => (
              <div key={d.label} className="flex h-full flex-1 flex-col justify-end">
                <div className="rounded-t bg-foreground" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex min-w-[480px] gap-2 pt-2">{data.map((d) => <span key={d.label} className="flex-1 truncate text-center text-sm text-muted-foreground">{d.label}</span>)}</div>
        </div>
      )}
    </figure>
  );
}

export function HBars({ title, data }: { title: string; data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return <p className="mt-4 text-lg text-muted-foreground">No payments recorded yet.</p>;
  return (
    <table className="mt-4 w-full text-base">
      <caption className="sr-only">{title}</caption>
      <tbody>
        {data.map((d) => (
          <tr key={d.label} className="border-b border-border">
            <th scope="row" className="w-2/5 py-3 pr-4 text-left font-normal">{d.label}</th>
            <td className="py-3" aria-hidden="true"><div className="h-2 rounded-full bg-card"><div className="h-2 rounded-full bg-foreground" style={{ width: `${(d.value / max) * 100}%` }} /></div></td>
            <td className="w-32 py-3 pl-4 text-right">{inr(d.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
