"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sileo } from "sileo";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoveLeft, Palette } from "lucide-react";

import { ApiTabContent } from "./tabs/api-tab-content";
import { AppearanceTabContent } from "./tabs/appearance-tab-content";
import { EmbedTabContent } from "./tabs/embed-tab-content";
import { KnowledgeTabContent } from "./tabs/knowledge-tab-content";
import { ManageTabContent } from "./tabs/manage-tab-content";
import type { Service } from "./tabs/types";

export default function ServiceDetailsViewRefactored({
  serviceId,
}: {
  serviceId: string;
}) {
  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
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
      fill: "oklch(0.9779 0.0042 56.38)",
      styles: {
        title: "text-destructive!",
        description: "text-[oklch(0.4563_0.0061_48.59)]!",
      },
    });
  }, [error]);

  useEffect(() => {
    if (!success) return;
    sileo.success({
      title: "Success",
      description: success,
      fill: "#98785d",
      styles: {
        description: "text-[#e3e0d8]!",
      },
    });
  }, [success]);

  return (
    <div className="min-h-svh bg-muted">
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
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
            <Card>
              <CardHeader>
                <CardTitle>{service.name}</CardTitle>
                <CardDescription>
                  {service.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>Slug: /{service.slug}</span>
                {aiLink ? (
                  <Button
                    asChild
                    size="sm"
                    className="ml-auto"
                    variant="outline"
                  >
                    <Link href={aiLink}>Chat with {service.name}</Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Tabs defaultValue="knowledge">
              <TabsList>
                <TabsTrigger className="cursor-pointer" value="knowledge">
                  Context
                </TabsTrigger>
                <TabsTrigger className="cursor-pointer" value="manage">
                  Edit & Manage
                </TabsTrigger>
                <TabsTrigger
                  className="cursor-pointer flex items-center"
                  value="appearance"
                >
                  <Palette className="h-4 w-4 mr-1" />
                  Appearance
                </TabsTrigger>
                <TabsTrigger className="cursor-pointer" value="api">
                  API
                </TabsTrigger>
                <TabsTrigger className="cursor-pointer" value="embed">
                  Embed
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

              <ApiTabContent
                serviceId={service.id}
                apiEndpoint={apiEndpoint}
                apiRequestExample={apiRequestExample}
                onError={setError}
                onSuccess={setSuccess}
              />

              <EmbedTabContent
                service={service}
                origin={origin}
                setService={setService}
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
