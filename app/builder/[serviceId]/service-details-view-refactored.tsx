"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sileo } from "sileo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Code2, ExternalLink, KeyRound, MoveLeft, Palette, Send, Sparkles } from "lucide-react";

import { AppearanceTabContent } from "./tabs/appearance-tab-content";
import { IntegrationsTabContent } from "./tabs/integrations-tab-content";
import { KnowledgeTabContent } from "./tabs/knowledge-tab-content";
import { ManageTabContent } from "./tabs/manage-tab-content";
import type { Service } from "./tabs/types";

export default function ServiceDetailsViewRefactored({
  serviceId,
}: {
  serviceId: string;
}) {
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [quickQuestion, setQuickQuestion] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("knowledge");
  const [showTourModal, setShowTourModal] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const scrollToApiKeySection = useCallback(() => {
    setActiveTab("manage");
    setShowTourModal(false);
    setTimeout(() => {
      const el =
        document.getElementById("external-model-keys-section") ||
        document.getElementById("gemini-key-input-manage");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = document.getElementById(
          "gemini-key-input-manage",
        ) as HTMLInputElement | null;
        if (input) {
          input.focus();
        }
      }
    }, 150);
  }, []);

  const tourSteps = useMemo(
    () => [
      {
        tab: "manage" as const,
        badge: "Recommended",
        badgeColor: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        icon: <KeyRound className="size-5" />,
        title: "1. Add Your Own Gemini API Key",
        description:
          "We strongly recommend connecting your own Google Gemini API key. The platform's default shared key may reach its rate limit during usage.",
        content: (
          <div className="space-y-2.5 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How to get your free key:</p>
            <ol className="list-decimal pl-4 space-y-1.5">
              <li>
                Go to{" "}
                <a
                  href="https://aistudio.google.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2 hover:opacity-80 inline-flex items-center gap-0.5"
                >
                  https://aistudio.google.com/api-keys
                  <ExternalLink className="size-3" />
                </a>
              </li>
              <li>Create a free API key & copy it</li>
              <li>Paste it into the API key field in the Edit & Manage tab</li>
            </ol>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={scrollToApiKeySection}
              className="mt-2 w-full gap-1.5 text-xs font-medium border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer"
            >
              <KeyRound className="size-3.5 text-amber-500" />
              Go to API Key section
              <ArrowRight className="size-3.5 ml-auto" />
            </Button>
          </div>
        ),
      },
      {
        tab: "knowledge" as const,
        badge: "Knowledge Base",
        badgeColor: "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        icon: <BookOpen className="size-5" />,
        title: "2. Add Knowledge & Context",
        description:
          "Feed documents and information to your AI so it provides grounded, accurate answers about your project or business.",
        content: (
          <div className="space-y-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <ul className="space-y-1.5 list-disc pl-4">
              <li>
                <strong>File Uploads:</strong> Ingest Word (.docx), PDF (.pdf), or text files with in-memory parsing (no files stored on disk).
              </li>
              <li>
                <strong>Manual Context:</strong> Paste plain text notes or documentation anytime.
              </li>
              <li>
                <strong>Vector Search:</strong> Context is chunked and retrieved using AI vector embeddings.
              </li>
            </ul>
          </div>
        ),
      },
      {
        tab: "manage" as const,
        badge: "Rules & Personality",
        badgeColor: "border-purple-500/40 bg-purple-500/10 text-purple-600 dark:text-purple-400",
        iconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        icon: <Sparkles className="size-5" />,
        title: "3. Set System Prompt & Behavior",
        description:
          "Define how your AI speaks, what role it plays, what rules it enforces, and guardrails for safe answers.",
        content: (
          <div className="space-y-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <ul className="space-y-1.5 list-disc pl-4">
              <li>
                <strong>Role & Identity:</strong> Customize who the assistant is (e.g., Support Agent, Tutor, Sales Rep).
              </li>
              <li>
                <strong>Tone of Voice:</strong> Professional, friendly, technical, or concise.
              </li>
              <li>
                <strong>Guardrails:</strong> Instruct what topics to focus on and what to avoid.
              </li>
            </ul>
          </div>
        ),
      },
      {
        tab: "appearance" as const,
        badge: "Branding",
        badgeColor: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        icon: <Palette className="size-5" />,
        title: "4. Customize Appearance",
        description:
          "Style your bot to match your brand and provide helpful quick starter prompts for your users.",
        content: (
          <div className="space-y-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <ul className="space-y-1.5 list-disc pl-4">
              <li>
                <strong>Theme Color:</strong> Pick an accent color for cards, bubbles, and buttons.
              </li>
              <li>
                <strong>Quick Prompts:</strong> Add clickable suggested questions to help users get started.
              </li>
              <li>
                <strong>Live Preview:</strong> See your styling updates immediately.
              </li>
            </ul>
          </div>
        ),
      },
      {
        tab: "api" as const,
        badge: "Deploy & Share",
        badgeColor: "border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        icon: <Code2 className="size-5" />,
        title: "5. Share, Embed, or Use API",
        description:
          "Make your AI available to users on the web, embed it as a widget, or connect via backend API.",
        content: (
          <div className="space-y-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground">
            <ul className="space-y-1.5 list-disc pl-4">
              <li>
                <strong>Shareable Link:</strong> Direct chat page for anyone to interact with your bot.
              </li>
              <li>
                <strong>Website Embed:</strong> Copy an embed snippet to add a floating chat widget to your site.
              </li>
              <li>
                <strong>Developer API:</strong> Generate API keys to query your bot programmatically.
              </li>
            </ul>
          </div>
        ),
      },
    ],
    [scrollToApiKeySection],
  );



  const goToStep = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= tourSteps.length) return;
    setTourStep(nextIdx);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("created") === "true") {
      setShowTourModal(true);
      setTourStep(0);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("created");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const aiLink = useMemo(() => {
    if (!service?.slug) return "";
    return `/chat/${service.slug}`;
  }, [service?.slug]);

  const apiEndpoint = useMemo(() => {
    if (!origin) return "/api/chat";
    return `${origin}/api/chat`;
  }, [origin]);

  const apiRequestExample = useMemo(() => {
    const exampleServiceId = service?.id || "YOUR_SERVICE_ID";
    return `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: tmai_your_api_key_here" \\
  -d '{
    "serviceId": "${exampleServiceId}",
    "messages": [
      { "role": "user", "content": "What do you do?" }
    ]
  }'`;
  }, [apiEndpoint, service?.id]);

  const loadService = useCallback(async () => {
    setIsLoadingService(true);
    setError("");

    try {
      const res = await fetch("/api/service", { method: "GET" });
      const data = (await res.json()) as {
        services?: Service[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to load service");
      }

      const found =
        (data.services ?? []).find((s) => s.id === serviceId) ?? null;
      if (!found) {
        throw new Error("Service not found");
      }

      setService(found);
    } catch (e: unknown) {
      setService(null);
      setError(e instanceof Error ? e.message : "Failed to load service");
    } finally {
      setIsLoadingService(false);
    }
  }, [serviceId]);

  useEffect(() => {
    void loadService();
  }, [loadService]);

  useEffect(() => {
    if (!error) return;
    sileo.error({
      title: "Error",
      description: error,
      fill: "oklch(0.985 0.005 250)",
      styles: {
        title: "text-destructive!",
        description: "text-[oklch(0.48_0.05_258)]!",
      },
    });
  }, [error]);

  useEffect(() => {
    if (!success) return;
    sileo.success({
      title: "Success",
      description: success,
      fill: "oklch(0.52 0.2 260)",
      styles: {
        description: "text-[oklch(0.94_0.03_250)]!",
      },
    });
  }, [success]);

  return (
    <div className="min-h-svh bg-muted">
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your AI details
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your service actions and integrations.
            </p>
          </div>
          <Button asChild variant="link">
            <Link href="/builder">
              <MoveLeft /> Back
            </Link>
          </Button>
        </div>

        {isLoadingService ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading service</CardTitle>
              <CardDescription>Please wait...</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ) : !service ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-sm text-muted-foreground">
                Service not found.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card className="border shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {service.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {service.description || "No description"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-muted px-2.5 py-1 rounded-md text-muted-foreground font-mono">
                      /{service.slug}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setTourStep(0);
                        setShowTourModal(true);
                      }}
                    >
                      <Sparkles className="size-3 text-primary" />
                      Bot Tour
                    </Button>
                    {aiLink ? (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Link href={aiLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Chat Page
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/70">Quick start:</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!service?.slug) return;
                      router.push(
                        `/chat/${service.slug}?q=${encodeURIComponent("What can you help me with?")}`,
                      );
                    }}
                    className="cursor-pointer rounded-md bg-muted px-2.5 py-1 text-xs hover:bg-muted/80 hover:text-foreground transition-colors"
                  >
                    "What can you help me with?"
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!service?.slug) return;
                      router.push(
                        `/chat/${service.slug}?q=${encodeURIComponent("Summarize your knowledge context")}`,
                      );
                    }}
                    className="cursor-pointer rounded-md bg-muted px-2.5 py-1 text-xs hover:bg-muted/80 hover:text-foreground transition-colors"
                  >
                    "Summarize your knowledge context"
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = quickQuestion.trim();
                    if (!service?.slug || !q) return;
                    router.push(`/chat/${service.slug}?q=${encodeURIComponent(q)}`);
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Input
                      value={quickQuestion}
                      onChange={(e) => setQuickQuestion(e.target.value)}
                      placeholder={`Ask ${service.name} a question to start...`}
                      className="h-10 bg-background"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!quickQuestion.trim()}
                    className="gap-2 cursor-pointer shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    <span>Start Chat</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList
                className="!grid !h-auto w-full grid-cols-2 gap-1.5 p-1.5 sm:grid-cols-4"
                style={{ display: "grid", height: "auto" }}
              >
                <TabsTrigger
                  className="cursor-pointer !h-9 !py-1.5"
                  style={{ height: "2.25rem" }}
                  value="knowledge"
                >
                  Context
                </TabsTrigger>
                <TabsTrigger
                  className="cursor-pointer !h-9 !py-1.5"
                  style={{ height: "2.25rem" }}
                  value="manage"
                >
                  Edit & Manage
                </TabsTrigger>
                <TabsTrigger
                  className="cursor-pointer flex items-center justify-center gap-1.5 !h-9 !py-1.5"
                  style={{ height: "2.25rem" }}
                  value="appearance"
                >
                  <Palette className="h-4 w-4 shrink-0" />
                  <span>Appearance</span>
                </TabsTrigger>
                <TabsTrigger
                  className="cursor-pointer flex items-center justify-center gap-1.5 !h-9 !py-1.5"
                  style={{ height: "2.25rem" }}
                  value="api"
                >
                  <Code2 className="h-4 w-4 shrink-0" />
                  <span>API & Embed</span>
                </TabsTrigger>
              </TabsList>

              <KnowledgeTabContent
                serviceId={service.id}
                onError={setError}
                onSuccess={setSuccess}
              />

              <ManageTabContent
                service={service}
                setService={setService}
                onError={setError}
                onSuccess={setSuccess}
              />

              <AppearanceTabContent
                service={service}
                setService={setService}
                onError={setError}
                onSuccess={setSuccess}
              />

              <IntegrationsTabContent
                service={service}
                origin={origin}
                setService={setService}
                apiEndpoint={apiEndpoint}
                apiRequestExample={apiRequestExample}
                onError={setError}
                onSuccess={setSuccess}
              />
            </Tabs>
          </div>
        )}
      </div>

      <Dialog open={showTourModal} onOpenChange={setShowTourModal}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-between pb-1 pr-6">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tourSteps[tourStep]?.badgeColor}`}
            >
              {tourSteps[tourStep]?.badge}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              Step {tourStep + 1} of {tourSteps.length}
            </span>
          </div>

          <DialogHeader>
            <div className="flex items-center gap-3 text-left">
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${tourSteps[tourStep]?.iconBg}`}
              >
                {tourSteps[tourStep]?.icon}
              </div>
              <DialogTitle className="text-base sm:text-lg">
                {tourSteps[tourStep]?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm text-left pt-1">
              {tourSteps[tourStep]?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-1">
            {tourSteps[tourStep]?.content}
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowTourModal(false)}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
            >
              Skip tour
            </Button>

            <div className="flex items-center gap-1.5">
              {tourSteps.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goToStep(i)}
                  className={`size-2 rounded-full transition-all cursor-pointer ${
                    i === tourStep
                      ? "w-4 bg-primary"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {tourStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToStep(tourStep - 1)}
                  className="h-8 gap-1 px-2.5 text-xs"
                >
                  <ChevronLeft className="size-3.5" />
                  Back
                </Button>
              )}

              {tourStep < tourSteps.length - 1 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => goToStep(tourStep + 1)}
                  className="h-8 gap-1 text-white text-xs"
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowTourModal(false)}
                  className="h-8 gap-1 text-white text-xs"
                >
                  <Check className="size-3.5" />
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
