import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, Reveal, CTABand } from "@/components/sections/primitives";
import { posts } from "@/data/blog";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    links: [{ rel: "canonical", href: "/blog" }],
    meta: [{ property: "og:url", content: "/blog" }, { name: "twitter:card", content: "summary_large_image" }, { property: "og:type", content: "website" }, 
      { title: "Blog | WebZaura" },
      { name: "description", content: "Practical guides on websites, local SEO, marketing and growth for Indian businesses." },
      { property: "og:title", content: "WebZaura Blog" },
      { property: "og:description", content: "Practical guides on growing your business online." },
    ],
  }),
  component: Blog,
});

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function Blog() {
  return (
    <>
      <PageHeader eyebrow="Blog" title="Notes on growing online." body="Short, practical guides from the work we do every day." />
      <section className="container-x pb-12">
        <ol className="border-b border-border">
          {posts.map((p) => (
            <li key={p.slug} className="border-t border-border">
              <Reveal>
                <Link to="/blog/$slug" params={{ slug: p.slug }} className="ghost-link grid gap-4 py-10 md:grid-cols-[200px_1fr] md:gap-10">
                  <p className="text-base text-muted-foreground">{p.category}<br />{fmtDate(p.date)}</p>
                  <div>
                    <h2 className="text-heading">{p.title}</h2>
                    <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{p.excerpt}</p>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>
      <CTABand />
    </>
  );
}
