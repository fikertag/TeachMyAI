import { Lightbulb, Pencil, PencilRuler } from "lucide-react";

export default function Content() {
  return (
    <section id="how-it-works" className="bg-background @container py-24">
      <div className="mx-auto max-w-2xl px-6">
        <div className="space-y-4">
          <h2 className="text-balance font-serif text-4xl font-medium">
            Train your assistant with your content
          </h2>
          <p className="text-muted-foreground">
            Upload service documentation, FAQs, policies, and product details.
            We convert it into a reliable assistant that answers questions using
            only your knowledge.
          </p>
        </div>
        <div className="@xl:grid-cols-3 mt-12 grid grid-cols-2 gap-6 text-sm">
          <div className="space-y-3 border-t pt-6">
            <Lightbulb className="text-muted-foreground size-4" />
            <p className="text-muted-foreground leading-5">
              <span className="text-foreground font-medium">
                Upload Knowledge
              </span>{" "}
              Add the content you want your assistant to use — policies, guides,
              product docs, and more.
            </p>
          </div>

          <div className="space-y-3 border-t pt-6">
            <Pencil className="text-muted-foreground size-4" />
            <p className="text-muted-foreground leading-5">
              <span className="text-foreground font-medium">Stay Grounded</span>{" "}
              Responses are generated from your uploaded knowledge, so answers
              stay consistent and on-topic.
            </p>
          </div>

          <div className="space-y-3 border-t pt-6">
            <PencilRuler className="text-muted-foreground size-4" />
            <p className="text-muted-foreground leading-5">
              <span className="text-foreground font-medium">
                Update Anytime
              </span>{" "}
              Change your knowledge whenever you need — the assistant keeps up
              after processing.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
