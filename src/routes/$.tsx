import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ConsultButton, Eyebrow } from "@/components/sections/primitives";

export const Route = createFileRoute("/$")({
  loader: () => { throw notFound(); },
  head: () => ({ meta: [
    { title: "Page not found | WebZaura" },
    { name: "description", content: "This WebZaura page could not be found. Return home or speak with us on WhatsApp." },
    { property: "og:title", content: "Page not found | WebZaura" },
    { property: "og:description", content: "Return to WebZaura for websites, marketing and Growth Consulting." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MissingPage,
  notFoundComponent: MissingPage,
});

function MissingPage() {
  return <section className="container-x flex min-h-[70vh] flex-col justify-center py-24">
    <Eyebrow>404</Eyebrow>
    <h1 className="mt-6 text-heading-lg">This page does not exist.</h1>
    <p className="mt-6 max-w-md text-lg text-muted-foreground">It may have moved, or the link was typed wrong.</p>
    <div className="mt-10 flex flex-wrap gap-3"><Link to="/" className="pill">Back to home</Link><ConsultButton /></div>
  </section>;
}