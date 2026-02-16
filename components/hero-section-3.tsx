import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroHeader } from "./header";
import {
  AudioLines,
  ChevronRight,
  MessageCircle,
  Mic2,
  Plus,
} from "lucide-react";
import Image from "next/image";
import LogoCloud from "@/components/logo-cloud-2";

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <section className="bg-background">
          <div className="relative py-40">
            <div className="mask-radial-from-45% mask-radial-to-75% mask-radial-at-top mask-radial-[75%_100%] aspect-2/3 absolute inset-0 opacity-75 blur-sm md:aspect-square lg:aspect-video dark:opacity-5">
              <Image
                src="/landing.avif"
                alt="hero background"
                width={2198}
                height={1685}
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="relative z-10 mx-auto w-full max-w-6xl sm:pl-6">
              <div className="flex items-center justify-between max-md:flex-col">
                <div className="max-w-lg max-sm:px-6">
                  <h1 className="text-balance font-serif text-4xl font-medium sm:text-5xl">
                    Turn your knowledge Into an AI assistant
                  </h1>
                  <p className="text-muted-foreground mt-4 text-balance">
                    Upload your service info, policies, and product docs. Get a
                    shareable chat link and an API endpoint that answers using
                    only your provided knowledge.
                  </p>

                  <Button asChild className="mt-6 pr-1.5" size={"lg"}>
                    <Link href="/builder">
                      <span className="text-nowrap text-amber-50">
                        Create your assistant
                      </span>
                      <ChevronRight className="opacity-50 text-amber-50" />
                    </Link>
                  </Button>
                </div>
                <div
                  aria-hidden
                  className="mask-y-from-50% relative max-md:mx-auto max-md:*:scale-90"
                >
                  {[
                    "What does your service include?",
                    "What is your refund policy?",
                    "How do I contact support?",
                    "Do you offer cancellations?",
                    "What are your business hours?",
                    "How does onboarding work?",
                    "Can I update the knowledge later?",
                    "Do you have a public chat link I can share?",
                    "Is there an API for developers?",
                    "What information do you use to answer?",
                    "What if the assistant doesn’t know the answer?",
                    "How do I embed this on my website?",
                  ].map((prompt, index) => (
                    <div
                      key={index}
                      className="text-muted-foreground flex items-center gap-2 px-14 py-2 text-sm"
                    >
                      <MessageCircle className="size-3.5 opacity-50" />
                      <span className="text-nowrap">{prompt}</span>
                    </div>
                  ))}
                  <div className="bg-card min-w-sm ring-border shadow-foreground/6.5 dark:shadow-black/6.5 absolute inset-0 m-auto mt-auto flex h-fit justify-between gap-3 rounded-full p-2 shadow-xl ring-1 sm:inset-2">
                    <div className="flex items-center gap-2">
                      <div className="hover:bg-muted flex size-9 cursor-pointer rounded-full *:m-auto *:size-4">
                        <Plus />
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Ask anything...
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="hover:bg-muted flex size-9 cursor-pointer rounded-full *:m-auto *:size-4">
                        <Mic2 />
                      </div>
                      <div className="bg-foreground text-background flex size-9 cursor-pointer rounded-full *:m-auto *:size-4 hover:brightness-110">
                        <AudioLines />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LogoCloud />
    </>
  );
}
