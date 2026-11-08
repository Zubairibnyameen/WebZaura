import { createFileRoute, Link } from "@tanstack/react-router";
import { ConsultButton, PageHeader, Reveal } from "@/components/sections/primitives";
import { ProjectCard } from "@/components/sections/home";
import { projects } from "@/data/projects";
import { getServiceByName } from "@/data/services";

type WorkSearch = { service?: string | undefined };

export const Route = createFileRoute("/work/")({
  validateSearch: (search: Record<string, unknown>): WorkSearch => ({
    service: typeof search["service"] === "string" ? search["service"] : undefined,
  }),
  head: () => ({
    links: [{ rel: "canonical", href: "/work" }],
    meta: [{ property: "og:url", content: "/work" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "Work | WebZaura" },
      { name: "description", content: "Projects by WebZaura across websites, marketing, design, apps and AI chatbots." },
      { property: "og:title", content: "Work | WebZaura" },
      { property: "og:description", content: "Selected projects by WebZaura." },
    ],
  }),
  component: WorkPage,
});

function WorkPage() {
  const { service } = Route.useSearch();
  if (projects.length === 0) {
    return (
      <section className="container-x pb-28 pt-16 md:pt-24">
        <Reveal>
          <h1 className="text-heading-lg">Our work.</h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground">We share work relevant to your business on a free consultation call.</p>
          <div className="mt-10"><ConsultButton /></div>
        </Reveal>
      </section>
    );
  }
  const serviceNames = [...new Set(projects.map((p) => p.service))];
  const active = service && serviceNames.includes(service) ? service : undefined;
  const shown = active ? projects.filter((p) => p.service === active) : projects;
  const linkCls = (on: boolean) =>
    `ghost-link inline-flex min-h-11 items-center text-lg ${on ? "underline underline-offset-8" : "text-muted-foreground"}`;
  return (
    <>
      <PageHeader eyebrow="Work" title="Recent projects." />
      <section className="container-x pb-28">
        <nav aria-label="Filter projects by service" className="mb-10 flex flex-wrap gap-x-7 gap-y-1 border-t border-border pt-6">
          <Link to="/work" search={{}} className={linkCls(!active)} aria-current={!active ? "page" : undefined}>All</Link>
          {serviceNames.map((name) => (
            <Link key={name} to="/work" search={{ service: name }} className={`${linkCls(active === name)} ${getServiceByName(name)?.color ?? ""}`} aria-current={active === name ? "page" : undefined}>{name}</Link>
          ))}
        </nav>
        <div className="grid gap-6 md:grid-cols-2">{shown.map((p) => <ProjectCard key={p.slug} p={p} headingLevel={2} />)}</div>
      </section>
    </>
  );
}
