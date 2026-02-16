"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Service = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
  createdAt?: string;
  updatedAt?: string;
};

export default function BuilderPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);

  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const hasService = services.length > 0;
  const primaryService = useMemo(() => services[0], [services]);
  const selectedService = useMemo(() => {
    if (!selectedServiceId) return services[0];
    return services.find((s) => s.id === selectedServiceId) ?? services[0];
  }, [selectedServiceId, services]);

  const loadServices = async () => {
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/service", { method: "GET" });
      const data = (await res.json()) as {
        services?: Service[];
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || "Failed to load services");
        setServices([]);
        return;
      }

      setServices(data.services ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load services");
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadServices();
  }, []);

  useEffect(() => {
    if (!selectedServiceId && services.length > 0) {
      setSelectedServiceId(services[0].id);
    }
  }, [selectedServiceId, services]);

  const createService = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Service name is required");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          systemPrompt: systemPrompt.trim(),
        }),
      });

      const data = (await res.json()) as { service?: Service; error?: string };

      if (!res.ok) {
        setError(data.error || "Failed to create service");
        return;
      }

      setName("");
      setDescription("");
      setSystemPrompt("");
      await loadServices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create service");
    } finally {
      setIsCreating(false);
    }
  };

  const ingestText = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedService?.id) {
      setError("Create a service first");
      return;
    }

    if (!docText.trim()) {
      setError("Text is required");
      return;
    }

    setIsIngesting(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          title: docTitle.trim() || undefined,
          text: docText,
        }),
      });

      const data = (await res.json()) as {
        documentId?: string;
        chunksInserted?: number;
        totalChunks?: number;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || "Failed to ingest text");
        return;
      }

      setDocTitle("");
      setDocText("");
      setSuccess(
        `Ingested ${data.chunksInserted ?? 0}/${data.totalChunks ?? 0} chunks`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to ingest text");
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div className="min-h-svh bg-muted">
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Builder</h1>
          <p className="text-sm text-muted-foreground">
            Create your service and manage it here.
          </p>
        </div>

        {error || success ? (
          <Card className="mb-6">
            <CardContent className="pt-6">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              {success ? (
                <p className="text-sm text-primary">{success}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create service</CardTitle>
              <CardDescription>
                You can only create one service per account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createService} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service-name">Name</Label>
                  <Input
                    id="service-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My tutoring bot"
                    disabled={hasService || isCreating}
                    className="bg-background"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="service-description">Description</Label>
                  <Input
                    id="service-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What this service helps with"
                    disabled={hasService || isCreating}
                    className="bg-background"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="service-system-prompt">System prompt</Label>
                  <Input
                    id="service-system-prompt"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Be helpful, concise, and accurate..."
                    disabled={hasService || isCreating}
                    className="bg-background"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="submit"
                    disabled={hasService || isCreating}
                    className="w-full sm:w-auto"
                  >
                    {hasService
                      ? "Service already created"
                      : isCreating
                        ? "Creating..."
                        : "Create service"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void loadServices()}
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My services</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Loading..."
                  : services.length === 0
                    ? "No services yet"
                    : "Your service details"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : services.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Create a service to get started.
                </p>
              ) : (
                <div className="grid gap-3">
                  <div className="rounded-md border bg-background p-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium">
                        {primaryService.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Slug: {primaryService.slug}
                      </p>
                    </div>
                    {primaryService.description ? (
                      <p className="mt-3 text-sm text-muted-foreground">
                        {primaryService.description}
                      </p>
                    ) : null}
                    {primaryService.systemPrompt ? (
                      <p className="mt-3 text-sm">
                        <span className="font-medium">System prompt:</span>{" "}
                        <span className="text-muted-foreground">
                          {primaryService.systemPrompt}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add knowledge</CardTitle>
              <CardDescription>
                Paste text to chunk + embed + store.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={ingestText} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service-select">Service</Label>
                  <select
                    id="service-select"
                    value={selectedService?.id ?? ""}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    disabled={!hasService || isIngesting}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="doc-title">Title (optional)</Label>
                  <Input
                    id="doc-title"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    placeholder="Chapter 1 - Introduction"
                    disabled={!hasService || isIngesting}
                    className="bg-background"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="doc-text">Text</Label>
                  <textarea
                    id="doc-text"
                    value={docText}
                    onChange={(e) => setDocText(e.target.value)}
                    placeholder="Paste your text here..."
                    disabled={!hasService || isIngesting}
                    className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="submit"
                    disabled={!hasService || isIngesting}
                    className="w-full sm:w-auto"
                  >
                    {!hasService
                      ? "Create a service first"
                      : isIngesting
                        ? "Ingesting..."
                        : "Send to ingest"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
