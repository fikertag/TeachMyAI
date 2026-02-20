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
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import type { Service } from "./types";

export function AppearanceTabContent({
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
  const [serviceColorDraft, setServiceColorDraft] = useState(
    service.color ?? "#ffffff",
  );
  const [serviceQuickPromptsDraft, setServiceQuickPromptsDraft] = useState<
    Array<{ title: string; prompt: string }>
  >(
    service.quickPrompts ?? [
      {
        title: "Get started",
        prompt: `Tell me more about ${service.name ?? "this service"}`,
      },
      {
        title: "Explore capabilities",
        prompt: "What can you help me with?",
      },
      {
        title: "Ask a question",
        prompt: "I have a specific question",
      },
    ],
  );
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [isSavingQuickPrompts, setIsSavingQuickPrompts] = useState(false);

  const defaultPrompts = useMemo(
    () => [
      {
        title: "Get started",
        prompt: `Tell me more about ${service.name ?? "this service"}`,
      },
      {
        title: "Explore capabilities",
        prompt: "What can you help me with?",
      },
      {
        title: "Ask a question",
        prompt: "I have a specific question",
      },
    ],
    [service.name],
  );

  useEffect(() => {
    setServiceColorDraft(service.color ?? "#ffffff");
    setServiceQuickPromptsDraft(service.quickPrompts ?? defaultPrompts);
  }, [service, defaultPrompts]);

  const saveColor = async () => {
    onError("");

    let normalizedColor = serviceColorDraft;
    if (!/^#[0-9A-Fa-f]{6}$/i.test(serviceColorDraft)) {
      if (/^#[0-9A-Fa-f]{3}$/i.test(serviceColorDraft)) {
        normalizedColor =
          "#" +
          serviceColorDraft[1] +
          serviceColorDraft[1] +
          serviceColorDraft[2] +
          serviceColorDraft[2] +
          serviceColorDraft[3] +
          serviceColorDraft[3];
      } else {
        onError(
          "Invalid color format. Please use a valid hex color (e.g., #FF0000)",
        );
        return;
      }
    }

    if (normalizedColor === (service.color ?? "#ffffff")) {
      return;
    }

    setIsSavingColor(true);
    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: normalizedColor }),
      });

      const data = (await res.json()) as { service?: Service; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save color");
      }

      setService((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          color: data.service?.color ?? prev.color,
        };
      });
      setServiceColorDraft(normalizedColor);
      onSuccess("Color updated");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to save color");
    } finally {
      setIsSavingColor(false);
    }
  };

  const saveQuickPrompts = async () => {
    onError("");

    const normalizedDraftPrompts = serviceQuickPromptsDraft.map((prompt) => ({
      title: prompt.title.trim(),
      prompt: prompt.prompt.trim(),
    }));

    const partiallyFilledPrompts = normalizedDraftPrompts.filter(
      (prompt) =>
        (prompt.title.length > 0 && prompt.prompt.length === 0) ||
        (prompt.title.length === 0 && prompt.prompt.length > 0),
    );

    if (partiallyFilledPrompts.length > 0) {
      onError(
        "Each quick prompt must have both title and message. Clear both fields to skip a row.",
      );
      return;
    }

    const cleanedPrompts = normalizedDraftPrompts.filter(
      (prompt) => prompt.title.length > 0 && prompt.prompt.length > 0,
    );

    const lengthInvalidPrompts = cleanedPrompts.filter(
      (prompt) => prompt.title.length > 100 || prompt.prompt.length > 1000,
    );

    if (lengthInvalidPrompts.length > 0) {
      onError(
        "Titles must be 100 characters or less, and messages must be 1000 characters or less.",
      );
      return;
    }

    if (cleanedPrompts.length === 0) {
      onError("Add at least one quick prompt before saving.");
      return;
    }

    if (cleanedPrompts.length > 10) {
      onError("Maximum 10 quick prompts allowed.");
      return;
    }

    let latestPromptsFromDb:
      | Array<{ title: string; prompt: string }>
      | undefined;
    try {
      const res = await fetch(`/api/service`, { method: "GET" });
      if (res.ok) {
        const data = (await res.json()) as {
          services?: Service[];
          error?: string;
        };
        const found = (data.services ?? []).find((s) => s.id === service.id);
        latestPromptsFromDb = found?.quickPrompts;
      }
    } catch {
      // fall back to local service state
    }

    const dbPrompts = (
      latestPromptsFromDb ??
      service.quickPrompts ??
      defaultPrompts
    )
      .map((prompt) => ({
        title: prompt.title.trim(),
        prompt: prompt.prompt.trim(),
      }))
      .filter((prompt) => prompt.title && prompt.prompt);

    if (JSON.stringify(cleanedPrompts) === JSON.stringify(dbPrompts)) {
      onSuccess("No quick prompt changes to save.");
      return;
    }

    setIsSavingQuickPrompts(true);
    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quickPrompts: cleanedPrompts }),
      });

      const data = (await res.json()) as {
        service?: Service;
        error?: string;
        details?: {
          fieldErrors?: Record<string, string[]>;
          formErrors?: string[];
        };
      };
      if (!res.ok) {
        const details = data.details;
        const flattenedDetails = details
          ? [
              ...(details.formErrors ?? []),
              ...Object.values(details.fieldErrors ?? {}).flat(),
            ]
              .filter(Boolean)
              .join("; ")
          : "";
        throw new Error(
          flattenedDetails || data.error || "Failed to save quick prompts",
        );
      }

      setService((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          quickPrompts: data.service?.quickPrompts ?? prev.quickPrompts,
        };
      });
      setServiceQuickPromptsDraft(data.service?.quickPrompts ?? cleanedPrompts);
      onSuccess("Quick prompts updated");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to save quick prompts");
    } finally {
      setIsSavingQuickPrompts(false);
    }
  };

  return (
    <TabsContent value="appearance" className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the visual appearance of your service.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="service-color">Color</Label>
              <Button
                type="button"
                size="sm"
                onClick={() => void saveColor()}
                disabled={isSavingColor}
              >
                {isSavingColor ? "Saving..." : "Save"}
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-10 rounded-md border-2 border-border cursor-pointer relative overflow-hidden"
                style={{ backgroundColor: serviceColorDraft }}
                onClick={() =>
                  document.getElementById("service-color")?.click()
                }
              >
                <input
                  id="service-color"
                  type="color"
                  value={serviceColorDraft}
                  onChange={(e) => {
                    setServiceColorDraft(e.target.value);
                    onError("");
                  }}
                  disabled={isSavingColor}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="text-sm font-mono text-muted-foreground bg-muted px-3 py-2 rounded-md border">
                  {serviceColorDraft.toUpperCase()}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the color square to open the color picker. This color will
              be used in the chat interface.
            </p>
          </div>

          <div className="grid gap-4 mt-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <Label className="text-base font-semibold">Quick prompts</Label>
                <p className="text-sm text-muted-foreground">
                  These buttons are shown at the top of the chat.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {serviceQuickPromptsDraft.length}/10 prompts
              </span>
            </div>

            <div className="space-y-3">
              {serviceQuickPromptsDraft.map((prompt, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-background p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold text-muted-foreground">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold">
                        {prompt.title.trim() || "Untitled prompt"}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {prompt.prompt.length}/1000
                    </span>
                  </div>

                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label
                        htmlFor={`prompt-title-${index}`}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Button title
                      </Label>
                      <Input
                        id={`prompt-title-${index}`}
                        type="text"
                        value={prompt.title}
                        onChange={(e) => {
                          const newPrompts = [...serviceQuickPromptsDraft];
                          newPrompts[index].title = e.target.value;
                          setServiceQuickPromptsDraft(newPrompts);
                          onError("");
                        }}
                        disabled={isSavingQuickPrompts}
                        placeholder="Ex: Get started"
                        maxLength={100}
                        className="bg-muted/40"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label
                        htmlFor={`prompt-text-${index}`}
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                      >
                        Message sent
                      </Label>
                      <Textarea
                        id={`prompt-text-${index}`}
                        value={prompt.prompt}
                        onChange={(e) => {
                          const newPrompts = [...serviceQuickPromptsDraft];
                          newPrompts[index].prompt = e.target.value;
                          setServiceQuickPromptsDraft(newPrompts);
                          onError("");
                        }}
                        disabled={isSavingQuickPrompts}
                        className="min-h-20 resize-none bg-muted/40"
                        placeholder="Ex: Tell me more about this service"
                        maxLength={1000}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void saveQuickPrompts()}
                disabled={isSavingQuickPrompts}
              >
                {isSavingQuickPrompts ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
