export const breadcrumbs = (items: { name: string; url: string }[]) => ({
  type: "application/ld+json",
  children: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })) }),
});