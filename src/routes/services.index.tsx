import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, CTABand } from "@/components/sections/primitives";
import { ServiceRows, Process } from "@/components/sections/home";

export const Route = createFileRoute("/services/")({
  head: () => ({
    links: [{ rel: "canonical", href: "/services" }],
    meta: [{ property: "og:url", content: "/services" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "Services | WebZaura" },
      { name: "description", content: "Web development, digital marketing, social media, design, AI chatbots, apps and growth consulting from one team." },
      { property: "og:title", content: "Services | WebZaura" },
      { property: "og:description", content: "Seven services to build, market and grow your business online." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  return (
    <>
      <PageHeader eyebrow="Services" title="What we do, and how we do it." body="From the website your customers see first to the plan that keeps them coming back. Pick one service or let us suggest where to start." />
      <ServiceRows withEyebrow={false} />
      <Process />
      <CTABand />
    </>
  );
}
