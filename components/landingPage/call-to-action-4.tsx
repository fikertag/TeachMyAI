import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Check } from "lucide-react";

const benefits = [
  "Create a knowledge-based AI assistant",
  "Share a public chat link",
  "Integrate via API",
  "Control and update knowledge anytime",
];

export default function CallToAction() {
  return (
    <section className="bg-background @container py-24">
      <div className="mx-auto max-w-5xl px-6">
        <Card className="@xl:grid-cols-2 grid gap-8 p-6 md:p-8">
          <div>
            <h2 className="text-balance font-serif text-3xl font-medium">
              Launch your AI assistant from your knowledge
            </h2>
            <p className="text-muted-foreground mt-3 text-balance">
              Upload your service content and let customers ask questions via a
              shareable link — or integrate the assistant directly using the
              API.
            </p>
            <ul className="mt-6 space-y-2">
              {benefits.map((benefit, index) => (
                <li
                  key={index}
                  className="text-muted-foreground flex items-center gap-2 text-sm"
                >
                  <Check className="text-primary size-4" />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-muted/50 flex flex-col justify-center rounded-xl border p-6">
            <p className="text-muted-foreground text-sm">Pricing</p>
            <p className="mt-1 font-serif text-4xl font-medium">Coming Soon</p>
            <p className="text-muted-foreground mt-1 text-sm">
              We’re finalizing plans for builders and teams.
            </p>
            <Button asChild className="mt-6 gap-2">
              <Link href="/signup">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
