import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, CTABand, Section } from "@/components/sections/primitives";
import { FaqList } from "@/components/sections/FaqList";
import { faqGroups } from "@/data/faqs";

export const Route = createFileRoute("/faq")({
  head: () => ({
    links: [{ rel: "canonical", href: "/faq" }],
    meta: [{ property: "og:url", content: "/faq" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "FAQ | WebZaura" },
      { name: "description", content: "Answers on websites, hosting, local SEO, Google Ads, Hindi content, UPI payments, the WhatsApp Business API and support." },
      { property: "og:title", content: "Frequently Asked Questions | WebZaura" },
      { property: "og:description", content: "Straight answers for Indian businesses growing online." },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <>
      <PageHeader eyebrow="FAQ" title="Straight answers." body="Cannot find what you need? Message us on WhatsApp and we will reply." />
      {faqGroups.map((g) => (
        <Section key={g.category}>
          <div className="grid gap-8 lg:grid-cols-[1fr_2fr]" aria-labelledby={`faq-${g.category}`}>
            <h2 id={`faq-${g.category}`} className="text-heading">{g.category}</h2>
            <FaqList items={g.items} prefix={g.category} />
          </div>
        </Section>
      ))}
      <CTABand title="Still have questions?" />
    </>
  );
}
