import { Bot, BookOpen, MessageCircle } from "lucide-react";

const steps = [
  {
    title: "Create your AI bot",
    description:
      "Sign up and easily create your own AI bot tailored to your needs.",
    icon: <Bot className="w-8 h-8 text-primary" />,
  },
  {
    title: "Add context ",
    description: "provide information to give your bot the knowledge it needs.",
    icon: <BookOpen className="w-8 h-8 text-primary" />,
  },
  {
    title: "Start chatting",
    description:
      "Interact with your bot via chat, API, or embed it in your app or website.",
    icon: <MessageCircle className="w-8 h-8 text-primary" />,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-25 bg-background">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-4xl font-bold text-center mb-14 tracking-tight">
          How it works
        </h2>
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-10 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="relative flex-1 bg-card rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-border transition-transform hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                {step.icon}
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white text-lg font-bold border-4 border-background shadow-md">
                  {idx + 1}
                </span>
              </div>
              <h3 className="text-2xl font-semibold mb-3 mt-6">{step.title}</h3>
              <p className="text-muted-foreground text-base mb-2">
                {step.description}
              </p>
              {idx < steps.length - 1 && (
                <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-16 h-1 bg-gradient-to-r from-primary/30 to-primary/70 opacity-60 z-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
