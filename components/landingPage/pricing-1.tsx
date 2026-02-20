import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    description: "For trying it out and small knowledge bases.",
    price: "Coming Soon",
    period: "",
    features: [
      "Create a knowledge-based assistant",
      "Share a public chat link",
      "API access",
      "Update knowledge anytime",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For teams running assistants in production.",
    price: "Coming Soon",
    period: "",
    features: [
      "Everything in Starter",
      "Higher limits (Coming Soon)",
      "Team collaboration (Coming Soon)",
      "Advanced analytics (Coming Soon)",
      "Webhooks (Coming Soon)",
      "Priority support (Coming Soon)",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    description: "For organizations with custom requirements.",
    price: "Coming Soon",
    period: "",
    features: [
      "Everything in Pro",
      "SSO (Coming Soon)",
      "Custom contracts (Coming Soon)",
      "Dedicated support (Coming Soon)",
      "SLA options (Coming Soon)",
      "Custom deployments (Coming Soon)",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-background @container py-24">
      <div className="mx-auto max-w-2xl px-6">
        <div className="text-center">
          <h2 className="text-balance font-serif text-4xl font-medium">
            Pricing (Coming Soon)
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-md text-balance">
            We’re finalizing simple plans for builders, teams, and enterprises.
            Start building now and we’ll share details when pricing launches.
          </p>
        </div>
        <div className="@3xl:grid-cols-2 mt-12 grid gap-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              // variant={plan.highlighted ? 'default' : 'mixed'}
              className={cn(
                "relative flex flex-col p-6 last:col-span-full",
                plan.highlighted && "ring-primary",
              )}
            >
              <div>
                <h3 className="text-foreground font-medium">{plan.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {plan.description}
                </p>
              </div>
              <div className="mt-6">
                <span className="font-serif text-4xl font-medium">
                  {plan.price}
                </span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-muted-foreground flex items-start gap-2 text-sm"
                  >
                    <Check className="text-primary mt-0.5 size-4 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.highlighted ? "default" : "outline"}
                className="mt-8 w-full"
              >
                <Link href="/signup">{plan.cta}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
