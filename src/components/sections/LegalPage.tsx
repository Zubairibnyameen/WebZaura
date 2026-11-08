import { PageHeader } from "./primitives";

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: [string, string][] }) {
  return (
    <>
      <PageHeader eyebrow="Legal" title={title} body={`Last updated ${updated}.`} />
      <div className="container-x border-t border-border pb-28">
        {sections.map(([h, t]) => (
          <section key={h} className="grid gap-4 border-b border-border py-10 md:grid-cols-[1fr_1.6fr] md:gap-10">
            <h2 className="text-heading">{h}</h2>
            <p className="max-w-2xl text-lg text-muted-foreground">{t}</p>
          </section>
        ))}
      </div>
    </>
  );
}
