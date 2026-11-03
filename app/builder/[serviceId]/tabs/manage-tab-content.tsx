import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { rga_ethify_cfg } from "@/lib/aiUtils/promots";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { PromptConfigDraft, Service } from "./types";

function stringifyPromptField(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join("\n");
  }

  return typeof value === "string" ? value : "";
}

function toPromptConfigDraft(
  value?: Record<string, unknown>,
): PromptConfigDraft {
  return {
    role: stringifyPromptField(value?.role),
    instruction: stringifyPromptField(value?.instruction),
    context: stringifyPromptField(value?.context),
    outputConstraints: stringifyPromptField(value?.output_constraints),
    styleOrTone: stringifyPromptField(value?.style_or_tone),
    outputFormat: stringifyPromptField(value?.output_format),
    examples: stringifyPromptField(value?.examples),
    goal: stringifyPromptField(value?.goal),
    reasoningStrategy: stringifyPromptField(value?.reasoning_strategy),
  };
}

function parsePromptMultiline(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return undefined;
  if (lines.length === 1) return lines[0];
  return lines;
}

function toPromptConfigPayload(draft: PromptConfigDraft) {
  const payload: Record<string, unknown> = {};

  if (draft.role.trim()) payload.role = draft.role.trim();

  const instruction = parsePromptMultiline(draft.instruction);
  if (instruction) payload.instruction = instruction;

  if (draft.context.trim()) payload.context = draft.context.trim();

  const outputConstraints = parsePromptMultiline(draft.outputConstraints);
  if (outputConstraints) payload.output_constraints = outputConstraints;

  const styleOrTone = parsePromptMultiline(draft.styleOrTone);
  if (styleOrTone) payload.style_or_tone = styleOrTone;

  const outputFormat = parsePromptMultiline(draft.outputFormat);
  if (outputFormat) payload.output_format = outputFormat;

  const examples = parsePromptMultiline(draft.examples);
  if (examples) payload.examples = examples;

  if (draft.goal.trim()) payload.goal = draft.goal.trim();
  if (draft.reasoningStrategy.trim()) {
    payload.reasoning_strategy = draft.reasoningStrategy.trim();
  }

  return Object.keys(payload).length > 0 ? payload : undefined;
}

export function ManageTabContent({
  service,
  setService,
  onError,
  onSuccess,
}: {
  service: Service;
  setService: React.Dispatch<React.SetStateAction<Service | null>>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [serviceSlugDraft, setServiceSlugDraft] = useState(service.slug ?? "");
  const [serviceDescriptionDraft, setServiceDescriptionDraft] = useState(
    service.description ?? "",
  );
  const [serviceSystemPromptDraft, setServiceSystemPromptDraft] = useState(
    service.systemPrompt ?? "",
  );
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [systemPromptEditorMode, setSystemPromptEditorMode] = useState<
    "text" | "builder"
  >(service.promptConfig ? "builder" : "text");
  const [promptBuilderDraft, setPromptBuilderDraft] =
    useState<PromptConfigDraft>(() =>
      toPromptConfigDraft(service.promptConfig),
    );
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [geminiApiKeyDraft, setGeminiApiKeyDraft] = useState("");
  const [isSavingGeminiApiKey, setIsSavingGeminiApiKey] = useState(false);

  const defaultSystemPromptText = useMemo(() => {
    const instruction = rga_ethify_cfg.instruction;
    if (Array.isArray(instruction)) {
      return instruction.join("\n");
    }
    return instruction ?? "";
  }, []);

  useEffect(() => {
    setServiceSlugDraft(service.slug ?? "");
    setServiceDescriptionDraft(service.description ?? "");
    setServiceSystemPromptDraft(service.systemPrompt ?? "");
    setPromptBuilderDraft(toPromptConfigDraft(service.promptConfig));
    setSystemPromptEditorMode(service.promptConfig ? "builder" : "text");
    setIsEditingSystemPrompt(false);
  }, [service]);

  const isUsingDefaultSystemPrompt = !serviceSystemPromptDraft.trim();
  const displayedSystemPrompt = isUsingDefaultSystemPrompt
    ? defaultSystemPromptText
    : serviceSystemPromptDraft;

  const saveGeneralDetails = async () => {
    onError("");

    const patch: Record<string, unknown> = {};
    const slugTrimmed = serviceSlugDraft.trim();

    if (slugTrimmed && slugTrimmed !== service.slug) {
      patch.slug = slugTrimmed;
    }

    if (serviceDescriptionDraft !== service.description) {
      patch.description = serviceDescriptionDraft;
    }

    if (Object.keys(patch).length === 0) {
      onSuccess("No changes to general details");
      return;
    }

    setIsSavingGeneral(true);
    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = (await res.json()) as { service?: Service; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to update general details");
      }

      setService((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slug: data.service?.slug ?? prev.slug,
          description: data.service?.description ?? prev.description,
        };
      });
      onSuccess("General details updated");
    } catch (e: unknown) {
      onError(
        e instanceof Error ? e.message : "Failed to update general details",
      );
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const saveSystemPrompt = async () => {
    onError("");

    const patch: Record<string, unknown> = {};

    if (
      systemPromptEditorMode === "text" &&
      serviceSystemPromptDraft !== (service.systemPrompt ?? "")
    ) {
      patch.systemPrompt = serviceSystemPromptDraft;
    }

    const currentPromptConfig = service.promptConfig ?? undefined;
    const nextPromptConfig =
      systemPromptEditorMode === "builder"
        ? toPromptConfigPayload(promptBuilderDraft)
        : undefined;

    if (systemPromptEditorMode === "builder") {
      if (
        JSON.stringify(currentPromptConfig ?? null) !==
        JSON.stringify(nextPromptConfig ?? null)
      ) {
        patch.promptConfig = nextPromptConfig;
      }
    } else if (service.promptConfig !== undefined) {
      patch.promptConfig = undefined;
    }

    if (Object.keys(patch).length === 0) {
      onSuccess("No changes to system prompt");
      setIsEditingSystemPrompt(false);
      return;
    }

    setIsSavingPrompt(true);
    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = (await res.json()) as { service?: Service; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save system prompt");
      }

      setService((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          systemPrompt: data.service?.systemPrompt ?? prev.systemPrompt,
          promptConfig: data.service?.promptConfig ?? prev.promptConfig,
        };
      });
      onSuccess("System prompt updated");
      setIsEditingSystemPrompt(false);
    } catch (e: unknown) {
      onError(
        e instanceof Error ? e.message : "Failed to save system prompt",
      );
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const saveGeminiApiKey = async () => {
    onError("");
    const payload = geminiApiKeyDraft.trim();
    if (!payload) {
      onError("Enter a Gemini API key or use Remove key");
      return;
    }
    setIsSavingGeminiApiKey(true);

    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey: payload,
        }),
      });

      const data = (await res.json()) as { service?: Service; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to save Gemini API key");
      }

      setService((prev) =>
        prev
          ? {
              ...prev,
              hasGeminiApiKey: data.service?.hasGeminiApiKey ?? true,
              geminiApiKeyLast4:
                data.service?.geminiApiKeyLast4 ?? prev.geminiApiKeyLast4,
              geminiApiKeyUpdatedAt:
                data.service?.geminiApiKeyUpdatedAt ??
                prev.geminiApiKeyUpdatedAt,
            }
          : prev,
      );

      setGeminiApiKeyDraft("");
      onSuccess("Gemini API key saved");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to save Gemini API key");
    } finally {
      setIsSavingGeminiApiKey(false);
    }
  };

  const removeGeminiApiKey = async () => {
    onError("");
    setIsSavingGeminiApiKey(true);

    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: null }),
      });

      const data = (await res.json()) as { service?: Service; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove Gemini API key");
      }

      setService((prev) =>
        prev
          ? {
              ...prev,
              hasGeminiApiKey: false,
              geminiApiKeyLast4: null,
              geminiApiKeyUpdatedAt: null,
            }
          : prev,
      );
      setGeminiApiKeyDraft("");
      onSuccess("Gemini API key removed");
    } catch (e: unknown) {
      onError(
        e instanceof Error ? e.message : "Failed to remove Gemini API key",
      );
    } finally {
      setIsSavingGeminiApiKey(false);
    }
  };

  const deleteService = async () => {
    setIsDeletingService(true);
    onError("");

    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete service");
      }

      window.location.href = "/builder";
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to delete service");
      setIsDeletingService(false);
    }
  };

  return (
    <TabsContent value="manage" className="mt-4 space-y-6">
      {/* Unified Manage Card */}
      <Card>
        <CardContent className="grid gap-6">
          {/* SECTION 1: General Details */}
          <div className="space-y-2">
            <div>
              <p className=" font-semibold">General Details</p>

            </div>

            <div className="rounded-md border bg-background p-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="service-name">Name</Label>
                  <Input
                    id="service-name"
                    value={service.name}
                    readOnly
                    disabled
                    className="bg-background"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="service-slug">Slug</Label>
                  <Input
                    id="service-slug"
                    value={serviceSlugDraft}
                    onChange={(e) => setServiceSlugDraft(e.target.value)}
                    disabled={isSavingGeneral || isDeletingService}
                    className="bg-background"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="service-description">Description</Label>
                <Textarea
                  id="service-description"
                  value={serviceDescriptionDraft}
                  onChange={(e) => setServiceDescriptionDraft(e.target.value)}
                  disabled={isSavingGeneral || isDeletingService}
                  className="min-h-24 bg-background"
                />
              </div>

              <div className="flex justify-start pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="text-white"
                  onClick={() => void saveGeneralDetails()}
                  disabled={isSavingGeneral || isDeletingService}
                >
                  {isSavingGeneral ? "Saving..." : "Save details"}
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 2: System Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">System Prompt</p>
              </div>
              {isEditingSystemPrompt ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setServiceSystemPromptDraft(service.systemPrompt ?? "");
                    setPromptBuilderDraft(
                      toPromptConfigDraft(service.promptConfig),
                    );
                    setSystemPromptEditorMode(
                      service.promptConfig ? "builder" : "text",
                    );
                    setIsEditingSystemPrompt(false);
                  }}
                  disabled={isSavingPrompt || isDeletingService}
                >
                  Close editor
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingSystemPrompt(true)}
                  disabled={isSavingPrompt || isDeletingService}
                >
                  Edit prompt
                </Button>
              )}
            </div>

            <div className="rounded-md border bg-background p-4">
              {isEditingSystemPrompt ? (
                <div className="grid gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        systemPromptEditorMode === "text" ? "default" : "outline"
                      }
                      className={
                        systemPromptEditorMode === "text" ? "text-white" : undefined
                      }
                      onClick={() => setSystemPromptEditorMode("text")}
                    >
                      Text area
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={
                        systemPromptEditorMode === "builder" ? "default" : "outline"
                      }
                      className={
                        systemPromptEditorMode === "builder"
                          ? "text-white"
                          : undefined
                      }
                      onClick={() => setSystemPromptEditorMode("builder")}
                    >
                      Prompt builder
                    </Button>
                  </div>

                  {systemPromptEditorMode === "text" ? (
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="service-system-prompt">
                          System prompt text
                        </Label>
                        <Link
                          href="/prompts"
                          className="text-sm text-primary hover:text-primary/80 underline"
                        >
                          Select from previous prompts
                        </Link>
                      </div>
                      {isUsingDefaultSystemPrompt ? (
                        <p className="text-xs text-muted-foreground">
                          You are editing the default prompt. Save to make it your
                          custom prompt.
                        </p>
                      ) : null}
                      <Textarea
                        id="service-system-prompt"
                        autoFocus
                        value={
                          isUsingDefaultSystemPrompt
                            ? defaultSystemPromptText
                            : serviceSystemPromptDraft
                        }
                        onChange={(e) =>
                          setServiceSystemPromptDraft(e.target.value)
                        }
                        disabled={isSavingPrompt || isDeletingService}
                        className="min-h-32 bg-background"
                        placeholder="Leave empty to use default prompt"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-3 border p-4 rounded-2xl bg-background">
                      <div className="grid gap-2 ">
                        <Label htmlFor="pb-role">Role</Label>
                        <Input
                          id="pb-role"
                          value={promptBuilderDraft.role}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              role: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="bg-background"
                          placeholder="A helpful AI assistant..."
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-instruction">Instruction</Label>
                        <Textarea
                          id="pb-instruction"
                          value={promptBuilderDraft.instruction}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              instruction: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="min-h-24 bg-background"
                          placeholder="Main instruction for the model"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-context">Context</Label>
                        <Textarea
                          id="pb-context"
                          value={promptBuilderDraft.context}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              context: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="min-h-20 bg-background"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-output-constraints">
                          Output constraints (one per line)
                        </Label>
                        <Textarea
                          id="pb-output-constraints"
                          value={promptBuilderDraft.outputConstraints}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              outputConstraints: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="min-h-20 bg-background"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-style">Style / tone</Label>
                        <Textarea
                          id="pb-style"
                          value={promptBuilderDraft.styleOrTone}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              styleOrTone: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="min-h-20 bg-background"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-output-format">
                          Output format (one per line)
                        </Label>
                        <Textarea
                          id="pb-output-format"
                          value={promptBuilderDraft.outputFormat}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              outputFormat: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="min-h-20 bg-background"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-examples">Examples (one per line)</Label>
                        <Textarea
                          id="pb-examples"
                          value={promptBuilderDraft.examples}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              examples: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="min-h-20 bg-background"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-goal">Goal</Label>
                        <Textarea
                          id="pb-goal"
                          value={promptBuilderDraft.goal}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              goal: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="min-h-20 bg-background"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="pb-reasoning">Reasoning strategy</Label>
                        <Input
                          id="pb-reasoning"
                          value={promptBuilderDraft.reasoningStrategy}
                          onChange={(e) =>
                            setPromptBuilderDraft((prev) => ({
                              ...prev,
                              reasoningStrategy: e.target.value,
                            }))
                          }
                          disabled={isSavingPrompt || isDeletingService}
                          className="bg-background"
                          placeholder="RAG"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-start pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="text-white"
                      onClick={() => void saveSystemPrompt()}
                      disabled={isSavingPrompt || isDeletingService}
                    >
                      {isSavingPrompt ? "Saving..." : "Save prompt"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {isUsingDefaultSystemPrompt ? (
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Using default prompt
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {displayedSystemPrompt}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: External Model Keys */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-semibold">External Model Keys</p>
              </div>
              <span
                className={`text-xs font-medium ${service?.hasGeminiApiKey ? "text-green-600" : "text-muted-foreground"}`}
              >
                {service?.hasGeminiApiKey ? "Connected" : "Not set"}
              </span>
            </div>

            <div className="rounded-md border bg-background p-4">
              <div>
                <p className="text-sm font-medium">Google Gemini</p>
                <p className="text-xs text-muted-foreground">
                  {service?.hasGeminiApiKey
                    ? `Key ending in ${service.geminiApiKeyLast4 ?? "****"}`
                    : "No custom key saved. Using platform default."}
                </p>
                {service?.geminiApiKeyUpdatedAt ? (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Updated:{" "}
                    {new Date(service.geminiApiKeyUpdatedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 border-t pt-3">
                <Label
                  htmlFor="gemini-key-input-manage"
                  className="text-xs font-medium"
                >
                  {service?.hasGeminiApiKey
                    ? "Update Gemini API key"
                    : "Add Gemini API key (optional)"}
                </Label>
                <Input
                  id="gemini-key-input-manage"
                  type="password"
                  value={geminiApiKeyDraft}
                  onChange={(e) => setGeminiApiKeyDraft(e.target.value)}
                  placeholder="AIza..."
                  className="mt-1.5 bg-background shadow-xs"
                />

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void saveGeminiApiKey()}
                    disabled={isSavingGeminiApiKey}
                    className="text-white"
                  >
                    {isSavingGeminiApiKey ? "Saving..." : "Save key"}
                  </Button>
                  {service?.hasGeminiApiKey && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void removeGeminiApiKey()}
                      disabled={isSavingGeminiApiKey}
                    >
                      Remove key
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DANGER ZONE: Delete Service */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this service and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Delete service</p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete the service, keys, and knowledge.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeletingService}
              >
                {isDeletingService ? "Deleting..." : "Delete service"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete service?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the service, keys, and knowledge.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => void deleteService()}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
