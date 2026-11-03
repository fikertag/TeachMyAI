import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { AudioLines, Mic2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroHeader } from "./header";

// Staggered reveal for the demo chat. Inline styles keep the delay and
// fill-mode working regardless of which animation utilities are installed;
// `motion-reduce:animate-none` shows everything immediately instead.
const reveal = (delayMs: number): CSSProperties => ({
  animationDelay: `${delayMs}ms`,
  animationFillMode: "both",
});

export default function HeroSection() {
  return (
    <>
    <div className="min-h-screen w-full relative bg-white">
  {/* Cool Blue Glow Top */}
  <div
    className="absolute inset-0 z-0"
    style={{
      background: "#ffffff",
      backgroundImage: `
        radial-gradient(
          circle at top center,
          rgba(70, 130, 180, 0.5),
          transparent 70%
        )
      `,
      filter: "blur(80px)",
      backgroundRepeat: "no-repeat",
    }}
  />
 <HeroHeader />
      <main className="overflow-hidden">
        <section className="landing-hero-bg relative">
          <div className="relative pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pb-24">
            <div className="relative z-10 mx-auto w-full max-w-7xl px-6 lg:px-8">
              <div className="grid items-center  gap-12 lg:grid-cols-2  ">
                {/* Copy */}
                <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                  <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                    <span className="block">Teach your AI once.</span>
                    <span className="block">Use it anywhere.</span>
                  </h1>

                  <p className="text-muted-foreground mt-6 max-w-md text-pretty text-base leading-relaxed sm:text-lg">
                    Add your documents, FAQs and policies. Your assistant
                    answers questions about your business from them, wherever
                    you put it.
                  </p>
{/* 
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg">
                      <Link href="/builder">Create your assistant</Link>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                      <Link href="/#how-it-works">See how it works</Link>
                    </Button>
                  </div> */}
                </div>

                {/* Demo chat (decorative) */}
                <div
                  aria-hidden
                  className="bg-card ring-border/60 shadow-foreground/5 mx-auto w-full max-w-md rounded-2xl border p-4 shadow-xl ring-1 sm:p-5 lg:mr-0"
                >
                  <div className="flex flex-col gap-3 text-sm leading-relaxed">
                    <div
                      className="bg-primary text-primary-foreground animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none ml-auto max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 duration-500"
                      style={reveal(300)}
                    >
                      What is your refund policy?
                    </div>
                    <div
                      className="bg-muted animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none mr-auto max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 duration-500"
                      style={reveal(1100)}
                    >
                      You can get a full refund within 14 days of purchase.
                      After that, we offer store credit.
                    </div>
                  </div>

                  <div className="bg-background mt-5 flex items-center justify-between gap-3 rounded-full border p-1.5">
                    <div className="flex items-center gap-2">
                      <div className="hover:bg-muted flex size-9 rounded-full *:m-auto *:size-4">
                        <Plus />
                      </div>
                      <div className="text-muted-foreground text-sm">
                        Ask anything...
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="hover:bg-muted flex size-9 rounded-full *:m-auto *:size-4">
                        <Mic2 />
                      </div>
                      <div className="bg-foreground text-background flex size-9 rounded-full *:m-auto *:size-4">
                        <AudioLines />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product preview */}
              <div className="relative mx-auto mt-16 max-w-5xl">
                <div className="border-border/70 bg-card/60 ring-border/50 rounded-2xl border p-2 shadow-2xl ring-1 backdrop-blur-md sm:p-3">
                  <div className="border-border/40 bg-background overflow-hidden rounded-xl border">
                    <Image
                      src="/carai.jpg"
                      alt="TeachMyAi platform overview"
                      width={1280}
                      height={720}
                      sizes="(min-width: 1024px) 1024px, 100vw"
                      className="h-auto w-full object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main></div>
     
    </>
  );
}