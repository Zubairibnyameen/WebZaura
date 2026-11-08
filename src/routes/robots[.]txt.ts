import { createFileRoute } from "@tanstack/react-router";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: ${getSiteUrl()}/sitemap.xml
`,
          { headers: { "content-type": "text/plain; charset=utf-8" } },
        ),
    },
  },
});
