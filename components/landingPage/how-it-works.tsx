import type { ReactNode } from "react";
import { Bot, Braces, Check, MessageCircle, PanelTop, Upload } from "lucide-react";

// The scenes below are decorative stand-ins. Swap the sample text, or replace
// a scene with a real screenshot, so each one matches your actual builder.

const sources = [
  { name: "Refund policy", type: "PDF", meta: "2 pages" },
  { name: "Pricing and plans", type: "DOC", meta: "1 page" },
  { name: "Shipping FAQ", type: "TXT", meta: "14 questions" },
];

const channels = [
  { icon: MessageCircle, name: "Chat" },
  { icon: Braces, name: "API" },
  { icon: PanelTop, name: "Embed" },
];

function Field({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <div
        className={`bg-background truncate rounded-lg border px-3 py-2 text-sm ${
          muted ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* Step 1: the form, with a live preview of the assistant overlapping it */
function CreateScene() {
  return (
    <div className="relative mb-5">
      <div className="bg-background space-y-3 rounded-xl border p-4 shadow-sm">
        <Field label="Assistant name" value="Acme Support" />
        <Field
          label="What should it help with?"
          value="Answer questions about orders and refunds"
          muted
        />
        <div className="flex justify-end">
          <div className="bg-primary text-primary-foreground rounded-md px-3.5 py-1.5 text-sm font-medium">
            Create assistant
          </div>
        </div>
      </div>

      <div className="bg-card absolute -bottom-5 right-3 w-56 rounded-xl border p-2.5 shadow-lg">
        <div className="flex items-start gap-2">
          <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full">
            <Bot className="size-3.5" />
          </span>
          <p className="text-xs leading-relaxed">
            Hi, I&apos;m Acme Support. Ask me about orders and refunds.
          </p>
        </div>
      </div>
    </div>
  );
}

/* Step 2: an upload row and the sources that have been added */
function ContextScene() {
  return (
    <div className="space-y-2">
      <div className="bg-background text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
        <Upload className="size-4 shrink-0" />
        Add files or paste text
      </div>

      <ul className="space-y-2">
        {sources.map((source) => (
          <li
            key={source.name}
            className="bg-background flex items-center gap-3 rounded-lg border px-3 py-2"
          >
            <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-medium">
              {source.type}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {source.name}
            </span>
            <span className="text-muted-foreground hidden text-xs sm:block">
              {source.meta}
            </span>
            <span className="bg-primary/10 text-primary flex size-5 shrink-0 items-center justify-center rounded-full">
              <Check className="size-3" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Step 3: the three ways to use it, with the embed option shown live */
function UseScene() {
  return (
    <div>
      <div className="bg-muted mb-3 grid grid-cols-3 gap-1 rounded-lg p-1 text-xs font-medium">
        {channels.map(({ icon: Icon, name }) => (
          <div
            key={name}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1 ${
              name === "Embed"
                ? "bg-background shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="size-3.5" />
            {name}
          </div>
        ))}
      </div>

      <div className="bg-background overflow-hidden rounded-xl border">
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b px-3 py-1.5">
          <div className="flex gap-1.5">
            <span className="bg-muted-foreground/30 size-2 rounded-full" />
            <span className="bg-muted-foreground/30 size-2 rounded-full" />
            <span className="bg-muted-foreground/30 size-2 rounded-full" />
          </div>
          <div className="bg-muted text-muted-foreground flex-1 rounded-md px-3 py-0.5 text-center text-xs">
            yourwebsite.com
          </div>
        </div>

        {/* Page with the assistant embedded */}
        <div className="relative h-36 space-y-2.5 p-4">
          <div className="bg-muted h-3.5 w-2/5 rounded" />
          <div className="bg-muted/70 h-2 w-1/2 rounded" />
          <div className="bg-muted/70 h-2 w-2/5 rounded" />

          <div className="bg-card absolute bottom-3 right-3 w-48 overflow-hidden rounded-xl border shadow-lg">
            <div className="bg-primary text-primary-foreground flex items-center gap-2 px-3 py-1.5">
              <Bot className="size-3.5" />
              <span className="text-xs font-medium">Acme Support</span>
            </div>
            <div className="space-y-1.5 p-2.5 text-xs">
              <div className="bg-primary text-primary-foreground ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm px-2.5 py-1">
                Do you ship abroad?
              </div>
              <div className="bg-muted flex w-fit items-center gap-1 rounded-lg rounded-bl-sm px-2.5 py-1.5">
                {[0, 200, 400].map((delay) => (
                  <span
                    key={delay}
                    className="bg-muted-foreground/60 size-1.5 rounded-full motion-safe:animate-pulse"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const steps: { title: string; description: string; visual: ReactNode }[] = [
  {
    title: "Create your assistant",
    description:
      "Sign up, name your assistant and say what it should help with.",
    visual: <CreateScene />,
  },
  {
    title: "Add what it should know",
    description:
      "Give it the information it needs: documents, FAQs, policies. This is what it learns from.",
    visual: <ContextScene />,
  },
  {
    title: "Use it anywhere",
    description:
      "Chat with it, call it through the API, or embed it in your app or website.",
    visual: <UseScene />,
  },
];

// Desktop zigzag: 1 top-left, 2 on the right and centred between the two left
// rows (so it overlaps both vertically), 3 bottom-left. On mobile it is a
// plain stack in order.
const placement = [
  "md:col-start-1 md:row-start-1",
  "md:col-start-2 md:row-start-1 md:row-span-2 md:self-center",
  "md:col-start-1 md:row-start-2",
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-background scroll-mt-20 py-10"
    >
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Set up your assistant in three steps
        </h2>

        <ol className="mt-10 grid gap-10 md:grid-cols-2 md:gap-x-12 md:gap-y-40 lg:gap-x-20">
          {steps.map((step, index) => (
            <li key={step.title} className={placement[index]}>
              <div className="flex items-baseline gap-3">
                <span className="text-primary text-4xl font-semibold tabular-nums tracking-tight">
                  {index + 1}
                </span>
                <h3 className="text-2xl font-semibold tracking-tight">
                  {step.title}
                </h3>
              </div>
              <p className="text-muted-foreground mt-2 max-w-sm leading-relaxed">
                {step.description}
              </p>

              <div
                aria-hidden
               className="bg-muted/40 mt-5 rounded-2xl 1 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:16px_16px] p-4 shadow-[0_12px_32px_-12px_color-mix(in_oklab,var(--primary)_35%,transparent)]"
              >
                {step.visual}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}