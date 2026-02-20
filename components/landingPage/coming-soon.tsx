import {
  Clock,
  Settings,
  Code2,
  MessageSquare,
  BarChart3,
  Languages,
} from "lucide-react";

const comingSoonFeatures = [
  {
    icon: <Languages className="w-7 h-7 text-primary" />,
    title: "Multi-language Support",
    description:
      "Interact with your AI assistant and manage content in multiple languages.",
  },
  {
    icon: <Clock className="w-7 h-7 text-primary" />,
    title: "Selecting Model",
    description:
      "Choose from a variety of AI models to best fit your use case.",
  },
  {
    icon: <Settings className="w-7 h-7 text-primary" />,
    title: "More Customisation",
    description:
      "Fine-tune your AI assistant's behavior and appearance with advanced options.",
  },
  {
    icon: <Code2 className="w-7 h-7 text-primary" />,
    title: "Code Export to Deploy",
    description:
      "Export ready-to-deploy code for your AI bot and integrate anywhere.",
  },
  {
    icon: <MessageSquare className="w-7 h-7 text-primary" />,
    title: "Chat History & Accounts",
    description:
      "Save chat history and manage user accounts for personalized experiences.",
  },
  {
    icon: <BarChart3 className="w-7 h-7 text-primary" />,
    title: "AI Analytics",
    description:
      "Track usage, performance, and insights for your deployed AI assistants.",
  },
];

export default function ComingSoon() {
  return (
    <section className="py-20 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 tracking-tight">
          Coming Soon
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 md:grid-cols-3">
          {comingSoonFeatures.map((feature, idx) => (
            <div
              key={idx}
              className="bg-card rounded-2xl shadow-lg p-7 flex flex-col items-center text-center border border-border transition-transform hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
