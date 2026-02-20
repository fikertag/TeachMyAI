import Image from "next/image";

const testimonials = [
  {
    avatar: "/me.jpeg",
    name: "Meschac Irung",
    role: "Frontend Engineer at Acme",
    quote:
      "We turned our internal docs into a customer-facing assistant and stopped answering the same questions over and over.",
  },
  {
    avatar: "/me.jpeg",
    name: "Theo Balick",
    role: "Founder, CEO - Acme",
    quote:
      "The public chat link is the easiest way we've found to share accurate service information with customers.",
  },
  {
    avatar: "/me.jpeg",
    name: "Sarah Johnson",
    role: "DevOps Engineer",
    quote:
      "The API integration was straightforward — we embedded the assistant into our app without changing our stack.",
  },
  {
    avatar: "/me.jpeg",
    name: "Aisha Patel",
    role: "Data Scientist",
    quote:
      "Updating knowledge is simple. When our policies change, the assistant stays aligned after reprocessing.",
  },
];

export default function Testimonials() {
  return (
    <section className="bg-background @container py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="space-y-4">
          <h2 className="text-balance font-serif text-4xl font-medium">
            Built for accurate customer answers
          </h2>
          <p className="text-muted-foreground text-balance">
            Teams use knowledge-based assistants to improve support, onboarding,
            and product discovery.
          </p>
        </div>
        <div className="@xl:grid-cols-2 mt-12 grid gap-3">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card ring-border text-foreground space-y-3 rounded-2xl p-4 text-sm ring-1"
            >
              <div className="flex gap-3">
                <div className="before:border-foreground/10 relative size-5 shrink-0 rounded-full before:absolute before:inset-0 before:rounded-full before:border">
                  <Image
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="rounded-full object-cover"
                    width={40}
                    height={40}
                  />
                </div>
                <p className="text-sm font-medium">
                  {testimonial.name}{" "}
                  <span className="text-muted-foreground ml-2 font-normal">
                    {testimonial.role}
                  </span>
                </p>
              </div>

              <p className="text-muted-foreground text-sm">
                {testimonial.quote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
