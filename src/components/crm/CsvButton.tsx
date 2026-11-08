import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CsvButton({ label = "Export CSV", file, load }: { label?: string; file: string; load: () => Promise<string> }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button variant="editorial" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const csv = await load();
        const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url; a.download = `${file}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
      } catch { toast.error("The export failed. Try again."); }
      setBusy(false);
    }}>{busy ? "Exporting..." : label}</Button>
  );
}
