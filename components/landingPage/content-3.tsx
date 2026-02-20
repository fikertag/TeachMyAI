import { Lightbulb, Pencil, PencilRuler } from "lucide-react";

export default function Content() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="space-y-4 text-center">
          <h2 className="text-balance font-serif text-4xl font-bold tracking-tight">
            Train your assistant with your content
          </h2>
          <p className="text-muted-foreground text-lg">
            Upload service documentation, FAQs, policies, and product details.
            <br />
            We convert it into a reliable assistant that answers questions using
            only your knowledge.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-border transition-transform hover:-translate-y-2 hover:shadow-2xl">
            <Lightbulb className="text-primary w-10 h-10 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Upload Knowledge</h3>
            <p className="text-muted-foreground">
              Add the content you want your assistant to use — policies, guides,
              product docs, and more.
            </p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-border transition-transform hover:-translate-y-2 hover:shadow-2xl">
            <Pencil className="text-primary w-10 h-10 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Stay Grounded</h3>
            <p className="text-muted-foreground">
              Responses are generated from your uploaded knowledge, so answers
              stay consistent and on-topic.
            </p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border border-border transition-transform hover:-translate-y-2 hover:shadow-2xl">
            <PencilRuler className="text-primary w-10 h-10 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Update Anytime</h3>
            <p className="text-muted-foreground">
              Change your knowledge whenever you need — the assistant keeps up
              after processing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
