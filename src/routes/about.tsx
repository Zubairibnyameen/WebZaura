import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Reveal, CTABand, Eyebrow, Section, ImageSlot } from "@/components/sections/primitives";
import { founder, journey } from "@/data/site";
import { images } from "@/data/images";

export const Route = createFileRoute("/about")({
  head: () => ({
    links: [{ rel: "canonical", href: "/about" }],
    meta: [{ property: "og:url", content: "/about" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "About | WebZaura" },
      { name: "description", content: "WebZaura is a web and growth agency from Delhi helping businesses across India get found and get enquiries online." },
      { property: "og:title", content: "About WebZaura" },
      { property: "og:description", content: "Who we are and how we work." },
    ],
  }),
  component: About,
});

const values = [
  ["Plain language", "We explain every decision simply, so you always know what we are doing and why."],
  ["Results first", "A good-looking site matters only if it brings in customers. We track what counts."],
  ["Close contact", "You talk to the person doing the work, usually on WhatsApp, and get quick answers."],
  ["Care in the details", "Every page, line of code and sentence is checked before it goes live."],
];

function About() {
  return (
    <>
      <PageHeader eyebrow="About" title="We help businesses grow online." body="Based in Delhi. We work with businesses across India. We build websites, run marketing and, most of all, help owners understand what to do next." />

      <Section>
        <div className="grid gap-12 md:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <ImageSlot slot={images.founder} alt={founder.name} ratio="4 / 5" />
          </Reveal>
          <Reveal delay={0.06} className="md:pt-4">
            <Eyebrow>Founder</Eyebrow>
            <h2 className="mt-6 text-heading">{founder.name}</h2>
            <p className="mt-3 text-lg text-muted-foreground">{founder.role}</p>
            <p className="mt-8 max-w-lg text-lg md:text-lg">{founder.bio}</p>
          </Reveal>
        </div>
      </Section>

      {images.workspace.src && (
        <Section>
          {/* REPLACE: temporary Unsplash placeholder, swap for a photo of our own workspace */}
          <ImageSlot slot={images.workspace} alt="A creative studio workspace" ratio="3 / 2" />
        </Section>
      )}

      <Section>
        <Eyebrow>What we care about</Eyebrow><h2 className="sr-only">Our values</h2>
        <ol className="mt-10 border-b border-border">
          {values.map(([t, b], i) => (
            <li key={t}><Reveal className="grid gap-4 border-t border-border py-8 md:grid-cols-[80px_1fr_1fr] md:gap-10">
              <span className="text-base text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-heading">{t}</h3>
              <p className="text-lg text-muted-foreground">{b}</p>
            </Reveal></li>
          ))}
        </ol>
      </Section>

      <Section>
        <Eyebrow>Timeline</Eyebrow>
        <ol className="mt-10 border-b border-border">
          {journey.map((j) => (
            <li key={j.year}><Reveal className="grid gap-4 border-t border-border py-8 md:grid-cols-[200px_1fr]">
              <span className="text-heading font-semibold text-brand">{j.year}</span>
              <p className="text-xl leading-[1.3]">{j.title}</p>
            </Reveal></li>
          ))}
        </ol>
      </Section>
      <CTABand />
    </>
  );
}
