import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Faq } from "@/data/faqs";

export function FaqList({ items, prefix = "f" }: { items: Faq[]; prefix?: string }) {
  return (
    <Accordion type="single" collapsible className="border-t border-border">
      {items.map((f, i) => (
        <AccordionItem key={f.q} value={`${prefix}-${i}`} className="border-border">
          <AccordionTrigger className="py-4 md:py-6 text-left text-lg font-semibold hover:no-underline hover:opacity-80">{f.q}</AccordionTrigger>
          <AccordionContent className="pb-6 text-lg text-muted-foreground">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
