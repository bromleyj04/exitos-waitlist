"use client";

import type { WaitlistProjectConfig } from "@/config/schema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FAQAccordion({ faq }: { faq: WaitlistProjectConfig["faq"] }) {
  return (
    <section className="mx-auto w-full max-w-2xl px-5 pb-24">
      <Accordion type="single" collapsible>
        {faq.map((item, index) => (
          <AccordionItem key={item.question} value={`item-${index}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

