import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { PageHead } from "@/components/crm/ui";
import { QuoteBuilder } from "@/components/crm/QuoteBuilder";

export const Route = createFileRoute("/_authenticated/app/quotations/new")({
  validateSearch: (s) => z.object({ lead: z.string().uuid().optional(), client: z.string().uuid().optional() }).catch({}).parse(s),
  head: () => ({ meta: [{ title: "New quotation | WebZaura" }, { name: "description", content: "Build a quotation." }, { property: "og:title", content: "New quotation | WebZaura" }, { property: "og:description", content: "Build a quotation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "robots", content: "noindex" }] }),
  component: NewQuote,
});

function NewQuote() {
  const { lead, client } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <div className="max-w-5xl">
      <Link to="/app/quotations" className="ghost-link text-base text-muted-foreground">Back to quotations</Link>
      <div className="mt-6"><PageHead eyebrow="Quotation" title="New quotation" /></div>
      <QuoteBuilder initial={{ lead_id: lead ?? null, client_id: client ?? null }} onSaved={(id) => {
        toast.success("Draft saved");
        qc.invalidateQueries({ queryKey: ["quotations"] });
        navigate({ to: "/app/quotations/$id", params: { id } });
      }} />
    </div>
  );
}
