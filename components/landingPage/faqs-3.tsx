"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from "next/link";

const faqItems = [
  {
    id: "item-1",
    question: "What kind of knowledge can I upload?",
    answer:
      "Upload information about your services, policies, products, FAQs, and internal guides — anything you want the assistant to use when answering questions.",
  },
  {
    id: "item-2",
    question: "Will the assistant answer only from my content?",
    answer:
      "The assistant is designed to ground responses in your uploaded knowledge and say when it doesn’t have enough information.",
  },
  {
    id: "item-3",
    question: "Can I update or remove knowledge later?",
    answer:
      "Yes. You can add, update, or remove content anytime. Changes take effect after the system reprocesses your knowledge.",
  },
  {
    id: "item-4",
    question: "How do I share it with customers?",
    answer:
      "Each service gets a shareable chat link you can send to customers or embed on your website.",
  },
  {
    id: "item-5",
    question: "Is there an API for developers?",
    answer:
      "Yes. Developers can call your service’s AI endpoint to integrate the trained assistant into websites and applications.",
  },
];

export default function FAQs() {
  return (
    <section id="faqs" className="bg-background @container py-24">
      <div className="mx-auto max-w-2xl px-2 md:px-6">
        <h2 className="text-center font-serif text-4xl font-medium">
          Your Questions Answered
        </h2>
        <Accordion type="single" collapsible className="mt-12">
          {faqItems.map((item) => (
            <div className="group" key={item.id}>
              <AccordionItem
                value={item.id}
                className="data-[state=open]:bg-muted/50 peer rounded-xl border-none px-5 py-1 transition-colors"
              >
                <AccordionTrigger className="cursor-pointer py-4 text-sm font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground pb-2 text-sm">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
              <hr className="mx-5 group-last:hidden peer-data-[state=open]:opacity-0" />
            </div>
          ))}
        </Accordion>
        <p className="text-muted-foreground mt-8 text-center text-sm">
          Need help getting set up?{" "}
          <Link
            href="https://t.me/fikertag"
            className="text-primary font-medium hover:underline"
          >
            Contact support
          </Link>
        </p>
      </div>
    </section>
  );
}
