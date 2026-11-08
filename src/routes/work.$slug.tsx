import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ConsultButton, CTABand, Eyebrow, ImageSlot, Reveal, Section } from "@/components/sections/primitives";
import { projectImage } from "@/data/images";
import { getProject, projects } from "@/data/projects";
import { getServiceByName } from "@/data/services";
import { external } from "@/lib/whatsapp";
import { breadcrumbs } from "@/lib/seo";

export const Route = createFileRoute("/work/$slug")({
  loader: ({ params }) => {
    const project = getProject(params.slug);
    if (!project) throw notFound();
    return { slug: project.slug };
  },
  head: ({ loaderData }) => {
    const p = loaderData ? getProject(loaderData.slug) : undefined;
    if (!p) return { meta: [{ name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, { title: "Project not found | WebZaura" }, { name: "robots", content: "noindex" }] };
    const title = `${p.name} | WebZaura Work`;
    return {
      links: [{ rel: "canonical", href: `/work/${p.slug}` }],
      scripts: [breadcrumbs([{ name: "Home", url: "/" }, { name: "Work", url: "/work" }, { name: p.name, url: `/work/${p.slug}` }])],
      meta: [
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: `/work/${p.slug}` },
        { title },
        { name: "description", content: p.description },
        { property: "og:title", content: title },
        { property: "og:description", content: p.description },
      ],
    };
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useLoaderData();
  const p = getProject(slug);
  if (!p) return null;
  const svc = getServiceByName(p.service);
  const others = projects.filter((x) => x.slug !== p.slug);
  const rows: [string, React.ReactNode][] = [
    ["Overview", p.overview],
    ["What we built", <ul className="space-y-3">{p.built.map((b) => <li key={b}>{b}</li>)}</ul>],
    ["Our approach", p.approach],
    ["Services used", <span className={svc?.color}>{p.service}</span>],
  ];

  return (
    <>
      <section className="container-x pb-20 pt-16 md:pt-24">
        <Reveal>
          <Link to="/work" className="ghost-link text-base text-muted-foreground">All work</Link>
          <p className={`mt-8 text-base ${svc?.color ?? "text-muted-foreground"}`}>{p.service}</p>
          <h1 className="mt-4 max-w-6xl text-heading-lg">{p.name}</h1>
          <p className="mt-6 text-base text-muted-foreground">{p.tag}</p>
          <p className="mt-8 max-w-2xl text-lg text-muted-foreground md:text-lg">{p.description}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <ConsultButton />
            {p.url && <a href={p.url} {...external} className="pill">Visit live site</a>}
          </div>
        </Reveal>
      </section>

      <Section>
        {/* REPLACE: temporary Unsplash placeholder, swap for a real project screenshot */}
        <ImageSlot slot={projectImage(p.slug, "desktop")} alt={`${p.name} preview`} ratio="16 / 10" priority />
        <dl className="mt-14 border-b border-border">
          {rows.map(([k, v]) => (
            <Reveal key={k} className="grid gap-4 border-t border-border py-10 md:grid-cols-[1fr_1.4fr] md:gap-10">
              <dt className="text-heading font-semibold leading-[1.1]">{k}</dt>
              <dd className="text-lg text-muted-foreground md:text-lg">{v}</dd>
            </Reveal>
          ))}
        </dl>
      </Section>

      <Section>
        <Eyebrow>More work</Eyebrow>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          {others.map((o) => (
            <li key={o.slug}><Link to="/work/$slug" params={{ slug: o.slug }} className="ghost-link text-xl">{o.name}</Link></li>
          ))}
        </ul>
      </Section>

      <CTABand title="Want something like this for your business?" />
    </>
  );
}
