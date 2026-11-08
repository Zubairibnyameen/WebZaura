import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CTABand, Eyebrow } from "@/components/sections/primitives";
import { getPost } from "@/data/blog";
import { breadcrumbs } from "@/lib/seo";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const p = getPost(params.slug);
    if (!p) throw notFound();
    return { slug: p.slug };
  },
  head: ({ loaderData }) => {
    const p = loaderData ? getPost(loaderData.slug) : undefined;
    if (!p) return { meta: [{ name: "twitter:card", content: "summary_large_image" }, { title: "Article not found | WebZaura" }, { name: "robots", content: "noindex" }] };
    return {
      links: [{ rel: "canonical", href: `/blog/${p.slug}` }],
      scripts: [breadcrumbs([{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }, { name: p.title, url: `/blog/${p.slug}` }]), { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "Article", headline: p.title, description: p.excerpt, datePublished: p.date, author: { "@type": "Organization", name: "WebZaura" } }) }],
      meta: [
        { name: "twitter:card", content: "summary_large_image" },
        { property: "og:url", content: `/blog/${p.slug}` },
        { property: "article:published_time", content: p.date },
        { title: `${p.title} | WebZaura Blog` },
        { name: "description", content: p.excerpt },
        { property: "og:title", content: p.title },
        { property: "og:description", content: p.excerpt },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: PostPage,
});

function PostPage() {
  const p = getPost(Route.useLoaderData().slug);
  if (!p) return null;
  return (
    <>
      <article className="container-x pb-20 pt-16 md:pt-24">
        <Link to="/blog" className="ghost-link text-base text-muted-foreground">All articles</Link>
        <div className="mt-10"><Eyebrow>{p.category}</Eyebrow></div>
        <h1 className="mt-6 max-w-5xl text-heading">{p.title}</h1>
        <p className="mt-6 text-base text-muted-foreground">{p.readTime}, {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
        <div className="mt-14 max-w-2xl space-y-6 text-lg leading-[1.45] md:text-lg">
          <p className="text-xl leading-[1.35]">{p.excerpt}</p>
          {p.body.map((b, i) => (
            <div key={i}>
              {b.heading && <h2 className="mb-4 mt-12 text-heading">{b.heading}</h2>}
              <p className="text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>
      </article>
      <CTABand title="Want a growth plan for your business?" />
    </>
  );
}
