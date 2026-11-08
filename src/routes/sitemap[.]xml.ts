import { createFileRoute } from "@tanstack/react-router";
import { posts } from "@/data/blog";
import { projects } from "@/data/projects";
import { services } from "@/data/services";
import { getSiteUrl } from "@/lib/site-url";

const staticPaths = [
  "/",
  "/about",
  "/services",
  "/work",
  "/blog",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
];

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const siteUrl = getSiteUrl();
        const paths = [
          ...staticPaths,
          ...services.map((service) => `/services/${service.slug}`),
          ...projects.map((project) => `/work/${project.slug}`),
          ...posts.map((post) => `/blog/${post.slug}`),
        ];
        const entries = paths
          .map((path) => `  <url><loc>${escapeXml(`${siteUrl}${path}`)}</loc></url>`)
          .join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
