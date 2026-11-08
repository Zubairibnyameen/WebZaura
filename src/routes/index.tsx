import { createFileRoute, Link } from "@tanstack/react-router";
import { Hero, ServiceRows, Shortcut, GrowthFeature, FeaturedWork, Process, Different, Testimonials } from "@/components/sections/home";
import { CTABand, Eyebrow, Reveal, Section } from "@/components/sections/primitives";
import { FaqList } from "@/components/sections/FaqList";
import { homeFaqs } from "@/data/faqs";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "/" }],
    meta: [{ property: "og:url", content: "/" }, 
      { title: "WebZaura | Websites built to perform" },
      { name: "description", content: "WebZaura builds fast websites, runs measurable marketing and offers growth consulting for businesses across India." },
      { property: "og:title", content: "WebZaura | Websites built to perform" },
      { property: "og:description", content: "Web development, digital marketing and growth consulting from Delhi, India." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <ServiceRows />
      <Shortcut />
      <GrowthFeature />
      <FeaturedWork />
      <Different />
      <Process />
      <Testimonials />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <Reveal><Eyebrow>FAQ</Eyebrow><h2 className="mt-6 text-heading">Questions people ask us.</h2></Reveal>
          <div className="home-faq"><FaqList items={homeFaqs} /><Link to="/faq" className="ghost-link mt-4 inline-flex min-h-11 items-center md:hidden">View all questions</Link></div>
        </div>
      </Section>
      <CTABand />
    </>
  );
}
