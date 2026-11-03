import { useEffect, useState } from "react";

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
import { Plus, Trash2 } from "lucide-react";

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
  >(service.quickPrompts ?? []);
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [isSavingQuickPrompts, setIsSavingQuickPrompts] = useState(false);



  useEffect(() => {
    setServiceColorDraft(service.color ?? "#ffffff");
    setServiceQuickPromptsDraft(service.quickPrompts ?? []);
  }, [service]);

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

    const dbPrompts = (latestPromptsFromDb ?? service.quickPrompts ?? [])
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
        <CardContent className="grid gap-6">

          {/* Color Section */}
          <div className="space-y-2">
            <p className="font-semibold">Accent Color</p>
            <div className="rounded-md border bg-background p-4">
              <div className="flex items-center gap-3">
                {/* Color swatch — click to open picker */}
                <div
                  className="h-9 w-9 shrink-0 rounded-md border-2 border-border cursor-pointer relative overflow-hidden"
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

                {/* Hex value */}
                <span className="text-sm font-mono text-muted-foreground">
                  {serviceColorDraft.toUpperCase()}
                </span>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Save button */}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveColor()}
                  disabled={isSavingColor}
                  className="text-white shrink-0"
                >
                  {isSavingColor ? "Saving..." : "Save color"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Click the swatch to open the color picker. This color is used in the chat interface.
              </p>
            </div>
          </div>

          {/* Quick Prompts Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Quick Prompts</p>
              <span className="text-xs text-muted-foreground">
                {serviceQuickPromptsDraft.length}/10
              </span>
            </div>

            <div className="rounded-md border bg-background p-4 grid gap-3">
              {serviceQuickPromptsDraft.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No quick prompts yet. Add one below.
                </p>
              )}

              {serviceQuickPromptsDraft.map((prompt, index) => (
                <div
                  key={index}
                  className="grid gap-2 pb-3 border-b last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <Input
                        id={`prompt-title-${index}`}
                        type="text"
                        value={prompt.title}
                        onChange={(e) => {
                          const newPrompts = [...serviceQuickPromptsDraft];
                          newPrompts[index] = { ...newPrompts[index], title: e.target.value };
                          setServiceQuickPromptsDraft(newPrompts);
                          onError("");
                        }}
                        disabled={isSavingQuickPrompts}
                        placeholder="Button title"
                        maxLength={100}
                        className="bg-background text-sm h-8"
                      />
                      <Input
                        id={`prompt-text-${index}`}
                        value={prompt.prompt}
                        onChange={(e) => {
                          const newPrompts = [...serviceQuickPromptsDraft];
                          newPrompts[index] = { ...newPrompts[index], prompt: e.target.value };
                          setServiceQuickPromptsDraft(newPrompts);
                          onError("");
                        }}
                        disabled={isSavingQuickPrompts}
                        placeholder="Message sent to AI"
                        maxLength={1000}
                        className="bg-background text-sm h-8"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newPrompts = serviceQuickPromptsDraft.filter((_, i) => i !== index);
                        setServiceQuickPromptsDraft(newPrompts);
                      }}
                      disabled={isSavingQuickPrompts}
                      className="shrink-0 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                      aria-label="Remove prompt"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add row + Save row */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSavingQuickPrompts || serviceQuickPromptsDraft.length >= 10}
                  onClick={() => {
                    setServiceQuickPromptsDraft([
                      ...serviceQuickPromptsDraft,
                      { title: "", prompt: "" },
                    ]);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add prompt
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveQuickPrompts()}
                  disabled={isSavingQuickPrompts}
                  className="text-white"
                >
                  {isSavingQuickPrompts ? "Saving..." : "Save prompts"}
                </Button>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </TabsContent>
  );
}
