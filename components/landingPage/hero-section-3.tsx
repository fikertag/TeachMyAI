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
// import LogoCloud from "@/components/landingPage/logo-cloud-2";
import { Merriweather_Sans } from "next/font/google";

const cascadia = Merriweather_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export default function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <section className="bg-background">
          <div className="relative md:py-45 py-35">
            <div
              className="mask-radial-from-45% mask-radial-to-75% mask-radial-at-top mask-radial-[75%_100%] 
  aspect-2/3 absolute inset-0 
   blur-xs
  md:aspect-square lg:aspect-video dark:opacity-70"
            >
              <Image
                src="/landing.avif"
                alt="hero background"
                width={2198}
                height={1685}
                className="h-full w-full object-cover object-top brightness-105"
              />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-7xl lg:px-7 sm:pl-6">
              <div className="flex items-center justify-between flex-col lg:flex-row">
                <div
                  className={`lg:max-w-2xl max-w-4xl  max-sm:px-6 ${cascadia.className} flex flex-col items-center lg:items-start`}
                >
                  <h1 className="text-balance cascadia-mono-stayled text-[40px] leading-12 min-[412px]:text-5xl text-center lg:text-start font-medium sm:text-6xl lg:leading-17">
                    Train your Own AI and use It <br /> anywere
                  </h1>
                  <p className="text-muted-foreground/50 text-sm min-[412px]:text-base mt-4 text-balance text-center lg:text-start">
                    Upload your service info, policies, and product docs. Get a
                    shareable chat link, script tag and an API endpoint that
                    answers using only your provided knowledge.
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
      {/* <LogoCloud /> */}
    </>
  );
}
