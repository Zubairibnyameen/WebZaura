import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ConsultButton, CTABand, Eyebrow, ImageSlot, Reveal, Section } from "@/components/sections/primitives";
import { images, serviceImage } from "@/data/images";
import { getService, services } from "@/data/services";
import { messages } from "@/lib/whatsapp";
import { breadcrumbs } from "@/lib/seo";

export const Route = createFileRoute("/services/$slug")({
  loader: ({ params }) => {
    const service = getService(params.slug);
    if (!service) throw notFound();
    return { slug: service.slug };
  },
  head: ({ loaderData }) => {
    const s = loaderData ? getService(loaderData.slug) : undefined;
    if (!s) return { meta: [{ name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, { title: "Service not found | WebZaura" }, { name: "robots", content: "noindex" }] };
    const title = `${s.name} | WebZaura`;
    return {
      links: [{ rel: "canonical", href: `/services/${s.slug}` }],
      scripts: [breadcrumbs([{ name: "Home", url: "/" }, { name: "Services", url: "/services" }, { name: s.name, url: `/services/${s.slug}` }]), { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Service", name: s.name, description: s.summary, provider: { "@type": "Organization", name: "WebZaura" }, areaServed: "India" }) }],
      meta: [
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: `/services/${s.slug}` },
        { title },
        { name: "description", content: s.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: s.summary },
      ],
    };
  },
  component: ServicePage,
});

function ServicePage() {
  const { slug } = Route.useLoaderData();
  const s = getService(slug);
  if (!s) return null;
  const msg = s.featured ? messages.growth : messages.service(s.name);
  const others = services.filter((x) => x.slug !== s.slug);
  const rows: [string, ReactNode][] = [
    ["What is included", <ul className="space-y-3">{s.included.map((x) => <li key={x}>{x}</li>)}</ul>],
    ["Who it is for", s.forWho],
    ["Our approach", s.approach],
    ["The outcome", s.outcome],
  ];

  return (
    <>
      <section className="container-x pb-20 pt-16 md:pt-24">
        <Reveal>
          <Eyebrow className={s.color}>{s.name}</Eyebrow>
          <h1 className="mt-6 max-w-6xl text-heading-lg">{s.headline}</h1>
          <p className="mt-8 max-w-2xl text-lg text-muted-foreground md:text-lg">{s.summary}</p>
          <div className="mt-10"><ConsultButton message={msg} /></div>
        </Reveal>
      </section>

      <Section inverted={s.featured === true}>
        {/* REPLACE: temporary Unsplash placeholder, swap for a real screenshot of this service */}
        <div className="mb-14 grid gap-6 md:grid-cols-2">
          <ImageSlot slot={serviceImage(s.slug)} alt={s.name} ratio="4 / 3" />
          {s.slug === "growth-consulting" && <ImageSlot slot={images.growth} alt="Analytics charts" ratio="4 / 3" />}
        </div>
        <dl className="border-b border-border">
          {rows.map(([k, v]) => (
            <Reveal key={k} className="grid gap-4 border-t border-border py-10 md:grid-cols-[1fr_1.4fr] md:gap-10">
              <dt className="text-heading font-semibold leading-[1.1]">{k}</dt>
              <dd className="text-lg text-muted-foreground md:text-lg">{v}</dd>
            </Reveal>
          ))}
        </dl>
      </Section>

      <Section>
        <Eyebrow>Other services</Eyebrow>
        <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
          {others.map((o) => (
            <li key={o.slug}><Link to="/services/$slug" params={{ slug: o.slug }} className={`ghost-link text-xl ${o.color}`}>{o.name}</Link></li>
          ))}
        </ul>
      </Section>

      <CTABand title={s.featured ? "Get a clear plan for growing online." : `Talk to us about ${s.name}.`} message={msg} />
    </>
  );
}
