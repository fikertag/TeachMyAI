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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code2, ExternalLink, MoveLeft, Palette, Send, Sparkles } from "lucide-react";

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

            <Tabs defaultValue="knowledge" className="w-full">
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
    </div>
  );
}
