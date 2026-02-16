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
import { rga_ethify_cfg } from "@/lib/aiUtils/promots";

type Service = {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  systemPrompt: string;
  promptConfig?: Record<string, unknown>;
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
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [useDefaultSystemPrompt, setUseDefaultSystemPrompt] = useState(true);

  const [customPromptMode, setCustomPromptMode] = useState<"text" | "builder">(
    "builder",
  );
  const [systemPromptText, setSystemPromptText] = useState("");

  const [promptRole, setPromptRole] = useState("");
  const [promptInstruction, setPromptInstruction] = useState("");
  const [promptContext, setPromptContext] = useState("");
  const [promptOutputFormat, setPromptOutputFormat] = useState("");
  const [promptExamples, setPromptExamples] = useState("");
  const [promptGoal, setPromptGoal] = useState("");
  const [promptReasoningStrategy, setPromptReasoningStrategy] = useState("");

  const loadDefaultPromptIntoBuilder = () => {
    setPromptRole(rga_ethify_cfg.role ?? "");
    setPromptInstruction(
      Array.isArray(rga_ethify_cfg.instruction)
        ? rga_ethify_cfg.instruction.join("\n")
        : (rga_ethify_cfg.instruction ?? ""),
    );
    setPromptContext(rga_ethify_cfg.context ?? "");
    setPromptOutputFormat(
      Array.isArray(rga_ethify_cfg.output_format)
        ? rga_ethify_cfg.output_format.join("\n")
        : (rga_ethify_cfg.output_format ?? ""),
    );
    setPromptExamples(
      Array.isArray(rga_ethify_cfg.examples)
        ? rga_ethify_cfg.examples.join("\n\n")
        : (rga_ethify_cfg.examples ?? ""),
    );
    setPromptGoal(rga_ethify_cfg.goal ?? "");
    setPromptReasoningStrategy(rga_ethify_cfg.reasoning_strategy ?? "RAG");
  };

  const splitList = (value: string) => {
    const items = value
      .split(/\n\s*\n|\r\n\s*\r\n/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length ? items : undefined;
  };

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

    if (!useDefaultSystemPrompt) {
      if (customPromptMode === "builder" && !promptInstruction.trim()) {
        setError("Instruction is required when using prompt builder");
        return;
      }
      if (customPromptMode === "text" && !systemPromptText.trim()) {
        setError("System prompt is required when using text mode");
        return;
      }
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim(),
          systemPrompt:
            useDefaultSystemPrompt || customPromptMode !== "text"
              ? undefined
              : systemPromptText.trim(),
          promptConfig:
            useDefaultSystemPrompt || customPromptMode !== "builder"
              ? undefined
              : {
                  role: promptRole.trim() || undefined,
                  instruction: promptInstruction.trim() || undefined,
                  context: promptContext.trim() || undefined,
                  output_format: splitList(promptOutputFormat),
                  examples: splitList(promptExamples),
                  goal: promptGoal.trim() || undefined,
                  reasoning_strategy:
                    promptReasoningStrategy.trim() || undefined,
                },
        }),
      });

      const data = (await res.json()) as { service?: Service; error?: string };

      if (!res.ok) {
        setError(data.error || "Failed to create service");
        return;
      }

      setName("");
      setSlug("");
      setDescription("");
      setUseDefaultSystemPrompt(true);
      setCustomPromptMode("builder");
      setSystemPromptText("");
      setPromptRole("");
      setPromptInstruction("");
      setPromptContext("");
      setPromptOutputFormat("");
      setPromptExamples("");
      setPromptGoal("");
      setPromptReasoningStrategy("");
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
                  <Label htmlFor="service-slug">Slug (optional)</Label>
                  <Input
                    id="service-slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="my-tutoring-bot"
                    disabled={hasService || isCreating}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in URLs. Leave blank to auto-generate from name.
                  </p>
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
                  <div className="flex items-center justify-between gap-2">
                    <Label>System prompt</Label>
                    <Button
                      type="button"
                      size="xs"
                      variant={useDefaultSystemPrompt ? "secondary" : "outline"}
                      disabled={hasService || isCreating}
                      onClick={() => {
                        setUseDefaultSystemPrompt((prev) => {
                          const next = !prev;
                          if (!next) {
                            // switching to custom
                            setCustomPromptMode("builder");
                            loadDefaultPromptIntoBuilder();
                          } else {
                            // switching back to default
                            setSystemPromptText("");
                            setPromptRole("");
                            setPromptInstruction("");
                            setPromptContext("");
                            setPromptOutputFormat("");
                            setPromptExamples("");
                            setPromptGoal("");
                            setPromptReasoningStrategy("");
                          }
                          return next;
                        });
                      }}
                    >
                      {useDefaultSystemPrompt
                        ? "Using default"
                        : "Using custom"}
                    </Button>
                  </div>

                  {useDefaultSystemPrompt ? (
                    <details className="rounded-md border border-input bg-background p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        View default prompt
                      </summary>
                      <div className="mt-3 grid gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Role
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {rga_ethify_cfg.role}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Instruction
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {Array.isArray(rga_ethify_cfg.instruction)
                              ? rga_ethify_cfg.instruction.join("\n")
                              : rga_ethify_cfg.instruction}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            Context
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm">
                            {rga_ethify_cfg.context}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={hasService || isCreating}
                          onClick={() => {
                            setUseDefaultSystemPrompt(false);
                            loadDefaultPromptIntoBuilder();
                          }}
                        >
                          Customize
                        </Button>
                      </div>
                    </details>
                  ) : (
                    <div className="grid gap-4 rounded-md border border-input bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Custom prompt</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={hasService || isCreating}
                          onClick={loadDefaultPromptIntoBuilder}
                        >
                          Reset to default
                        </Button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant={
                            customPromptMode === "text"
                              ? "secondary"
                              : "outline"
                          }
                          disabled={hasService || isCreating}
                          onClick={() => setCustomPromptMode("text")}
                        >
                          Text area
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant={
                            customPromptMode === "builder"
                              ? "secondary"
                              : "outline"
                          }
                          disabled={hasService || isCreating}
                          onClick={() => {
                            setCustomPromptMode("builder");
                            if (
                              !promptRole &&
                              !promptInstruction &&
                              !promptContext &&
                              !promptOutputFormat &&
                              !promptExamples &&
                              !promptGoal &&
                              !promptReasoningStrategy
                            ) {
                              loadDefaultPromptIntoBuilder();
                            }
                          }}
                        >
                          Prompt builder
                        </Button>
                      </div>

                      {customPromptMode === "text" ? (
                        <div className="grid gap-2">
                          <Label htmlFor="system-prompt-text">
                            System prompt (text)
                          </Label>
                          <textarea
                            id="system-prompt-text"
                            value={systemPromptText}
                            onChange={(e) =>
                              setSystemPromptText(e.target.value)
                            }
                            placeholder="Write your system prompt..."
                            disabled={hasService || isCreating}
                            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="prompt-role">Role</Label>
                            <Input
                              id="prompt-role"
                              value={promptRole}
                              onChange={(e) => setPromptRole(e.target.value)}
                              placeholder="A helpful AI assistant..."
                              disabled={hasService || isCreating}
                              className="bg-background"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="prompt-instruction">
                              Instruction
                            </Label>
                            <textarea
                              id="prompt-instruction"
                              value={promptInstruction}
                              onChange={(e) =>
                                setPromptInstruction(e.target.value)
                              }
                              placeholder="What the assistant should do..."
                              disabled={hasService || isCreating}
                              className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <p className="text-xs text-muted-foreground">
                              Required for custom prompts.
                            </p>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="prompt-context">Context</Label>
                            <textarea
                              id="prompt-context"
                              value={promptContext}
                              onChange={(e) => setPromptContext(e.target.value)}
                              placeholder="Background info for the assistant..."
                              disabled={hasService || isCreating}
                              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="prompt-output-format">
                              Output format
                            </Label>
                            <textarea
                              id="prompt-output-format"
                              value={promptOutputFormat}
                              onChange={(e) =>
                                setPromptOutputFormat(e.target.value)
                              }
                              placeholder="One item per paragraph (separate items with a blank line)"
                              disabled={hasService || isCreating}
                              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="prompt-examples">Examples</Label>
                            <textarea
                              id="prompt-examples"
                              value={promptExamples}
                              onChange={(e) =>
                                setPromptExamples(e.target.value)
                              }
                              placeholder="Separate examples with a blank line"
                              disabled={hasService || isCreating}
                              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="prompt-goal">Goal</Label>
                            <textarea
                              id="prompt-goal"
                              value={promptGoal}
                              onChange={(e) => setPromptGoal(e.target.value)}
                              placeholder="What the assistant should achieve..."
                              disabled={hasService || isCreating}
                              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                            />
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="prompt-reasoning">
                              Reasoning strategy
                            </Label>
                            <Input
                              id="prompt-reasoning"
                              value={promptReasoningStrategy}
                              onChange={(e) =>
                                setPromptReasoningStrategy(e.target.value)
                              }
                              placeholder="RAG"
                              disabled={hasService || isCreating}
                              className="bg-background"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}
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
