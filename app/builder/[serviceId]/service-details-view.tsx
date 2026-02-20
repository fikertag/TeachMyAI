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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Code2,
  Copy,
  ExternalLink,
  Link2,
  MoveLeft,
  Palette,
  X,
} from "lucide-react";
import { rga_ethify_cfg } from "@/lib/aiUtils/promots";

type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  color?: string;
  quickPrompts?: Array<{
    title: string;
    prompt: string;
  }>;
  systemPrompt?: string;
  allowedOrigins?: string[];
  hasGeminiApiKey?: boolean;
  geminiApiKeyLast4?: string | null;
  geminiApiKeyUpdatedAt?: string | null;
  promptConfig?: Record<string, unknown>;
};

type PromptConfigDraft = {
  role: string;
  instruction: string;
  context: string;
  outputConstraints: string;
  styleOrTone: string;
  outputFormat: string;
  examples: string;
  goal: string;
  reasoningStrategy: string;
};

type KnowledgeDocument = {
  id: string;
  serviceId: string;
  title: string;
  source: string;
  revokedAt?: string;
};

type ApiKey = {
  id: string;
  name: string;
  apiKey?: string;
  prefix: string;
  last4: string;
  rateLimitPerMinute?: number;
  monthlyRequestLimit?: number;
  lastUsedAt?: string;
  usage?: {
    minute?: { windowStart: string; count: number };
    month?: { windowStart: string; count: number };
  };
  revokedAt?: string;
};

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

function normalizeOriginLine(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.startsWith("*.")) {
    const host = trimmed.slice(2).trim();
    return host ? `*.${host}` : null;
  }

  try {
    const parsed = new URL(
      trimmed.includes("://") ? trimmed : `https://${trimmed}`,
    );
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}`.toLowerCase();
  } catch {
    return null;
  }
}

export default function ServiceDetailsView({
  serviceId,
}: {
  serviceId: string;
}) {
  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [serviceSlugDraft, setServiceSlugDraft] = useState("");
  const [serviceDescriptionDraft, setServiceDescriptionDraft] = useState("");
  const [serviceSystemPromptDraft, setServiceSystemPromptDraft] = useState("");
  const [serviceColorDraft, setServiceColorDraft] = useState("");
  const [serviceQuickPromptsDraft, setServiceQuickPromptsDraft] = useState<
    Array<{
      title: string;
      prompt: string;
    }>
  >([]);
  const [isEditingSystemPrompt, setIsEditingSystemPrompt] = useState(false);
  const [systemPromptEditorMode, setSystemPromptEditorMode] = useState<
    "text" | "builder"
  >("text");
  const [promptBuilderDraft, setPromptBuilderDraft] =
    useState<PromptConfigDraft>(() => toPromptConfigDraft());
  const [isSavingService, setIsSavingService] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [isSavingQuickPrompts, setIsSavingQuickPrompts] = useState(false);
  const [embedOriginsDraft, setEmbedOriginsDraft] = useState("");
  const [embedOriginInput, setEmbedOriginInput] = useState("");
  const [isSavingEmbedOrigins, setIsSavingEmbedOrigins] = useState(false);
  const [geminiApiKeyDraft, setGeminiApiKeyDraft] = useState("");
  const [isSavingGeminiApiKey, setIsSavingGeminiApiKey] = useState(false);

  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [busyDocId, setBusyDocId] = useState("");
  const [busyDocAction, setBusyDocAction] = useState<"revoke" | "delete" | "">(
    "",
  );

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isCreateApiKeyDialogOpen, setIsCreateApiKeyDialogOpen] =
    useState(false);
  const [busyKeyId, setBusyKeyId] = useState("");
  const [busyKeyAction, setBusyKeyAction] = useState<"revoke" | "delete" | "">(
    "",
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const aiLink = useMemo(() => {
    if (!service?.slug) return "";
    return `/chat/${service.slug}`;
  }, [service?.slug]);

  const embedUrl = useMemo(() => {
    if (!service?.id || !origin) return "";
    return `${origin}/embed/chat?service=${service.id}`;
  }, [origin, service?.id]);

  const embedScript = useMemo(() => {
    if (!service?.id || !origin) return "";
    return `<script src="${origin}/widget.js" data-service="${service.id}"><\/script>`;
  }, [origin, service?.id]);

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

  const defaultSystemPromptText = useMemo(() => {
    const instruction = rga_ethify_cfg.instruction;
    if (Array.isArray(instruction)) {
      return instruction.join("\n");
    }
    return instruction ?? "";
  }, []);

  const draftOriginLines = useMemo(
    () =>
      embedOriginsDraft
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [embedOriginsDraft],
  );

  const validDraftOrigins = useMemo(
    () =>
      Array.from(
        new Set(
          draftOriginLines
            .map((line) => normalizeOriginLine(line))
            .filter((line): line is string => Boolean(line)),
        ),
      ),
    [draftOriginLines],
  );

  const invalidDraftOrigins = useMemo(
    () =>
      draftOriginLines.filter((line) => {
        return !normalizeOriginLine(line);
      }),
    [draftOriginLines],
  );

  const isUsingDefaultSystemPrompt = !serviceSystemPromptDraft.trim();
  const displayedSystemPrompt = isUsingDefaultSystemPrompt
    ? defaultSystemPromptText
    : serviceSystemPromptDraft;

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
      setServiceSlugDraft(found.slug ?? "");
      setServiceDescriptionDraft(found.description ?? "");
      setServiceSystemPromptDraft(found.systemPrompt ?? "");
      setServiceColorDraft(found.color ?? "#ffffff");
      // Only set draft from backend, do not update service.quickPrompts on edit
      setServiceQuickPromptsDraft(
        found.quickPrompts ?? [
          {
            title: "Get started",
            prompt: `Tell me more about ${found.name ?? "this service"}`,
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
      setEmbedOriginsDraft((found.allowedOrigins ?? []).join("\n"));
      setPromptBuilderDraft(toPromptConfigDraft(found.promptConfig));
      setSystemPromptEditorMode(found.promptConfig ? "builder" : "text");
      setIsEditingSystemPrompt(false);
    } catch (e: unknown) {
      setService(null);
      setError(e instanceof Error ? e.message : "Failed to load service");
    } finally {
      setIsLoadingService(false);
    }
  }, [serviceId]);

  const loadKnowledge = async (id: string) => {
    setIsLoadingKnowledge(true);
    try {
      const res = await fetch(`/api/knowledge?serviceId=${id}`, {
        method: "GET",
      });
      const data = (await res.json()) as {
        documents?: KnowledgeDocument[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to load knowledge");
      }

      setKnowledgeDocs(data.documents ?? []);
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  const loadApiKeys = async (id: string) => {
    setIsLoadingKeys(true);
    try {
      const url = new URL("/api/api-keys", window.location.origin);
      url.searchParams.set("serviceId", id);
      url.searchParams.set("includeUsage", "true");
      const res = await fetch(url.toString(), { method: "GET" });
      const data = (await res.json()) as { apiKeys?: ApiKey[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to load API keys");
      }

      setApiKeys(data.apiKeys ?? []);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    void loadService();
  }, [loadService]);

  useEffect(() => {
    if (!service?.id) return;

    let cancelled = false;
    const run = async () => {
      try {
        await Promise.all([loadKnowledge(service.id), loadApiKeys(service.id)]);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load data");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [service?.id]);

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

  const saveService = async () => {
    if (!service?.id) return;

    setError("");
    setSuccess("");

    const patch: Record<string, unknown> = {};
    const slugTrimmed = serviceSlugDraft.trim();

    if (slugTrimmed && slugTrimmed !== service.slug) {
      patch.slug = slugTrimmed;
    }

    if (serviceDescriptionDraft !== service.description) {
      patch.description = serviceDescriptionDraft;
    }

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
      setSuccess("No changes to save");
      return;
    }

    setIsSavingService(true);
    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = (await res.json()) as { service?: Service; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save service");
      }

      setService((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          slug: data.service?.slug ?? prev.slug,
          description: data.service?.description ?? prev.description,
          systemPrompt: data.service?.systemPrompt ?? prev.systemPrompt,
          allowedOrigins:
            data.service?.allowedOrigins ?? prev.allowedOrigins ?? [],
          hasGeminiApiKey:
            data.service?.hasGeminiApiKey ?? prev.hasGeminiApiKey,
          geminiApiKeyLast4:
            data.service?.geminiApiKeyLast4 ?? prev.geminiApiKeyLast4,
          geminiApiKeyUpdatedAt:
            data.service?.geminiApiKeyUpdatedAt ?? prev.geminiApiKeyUpdatedAt,
          promptConfig: data.service?.promptConfig ?? prev.promptConfig,
        };
      });
      setSuccess("Service updated");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save service");
    } finally {
      setIsSavingService(false);
    }
  };

  const saveColor = async () => {
    if (!service?.id) {
      setError("Service not loaded. Please refresh the page.");
      return;
    }

    setError("");
    setSuccess("");

    // Validate and normalize color format
    let normalizedColor = serviceColorDraft;
    if (!/^#[0-9A-Fa-f]{6}$/i.test(serviceColorDraft)) {
      if (/^#[0-9A-Fa-f]{3}$/i.test(serviceColorDraft)) {
        // Convert 3-digit hex to 6-digit hex
        normalizedColor =
          "#" +
          serviceColorDraft[1] +
          serviceColorDraft[1] +
          serviceColorDraft[2] +
          serviceColorDraft[2] +
          serviceColorDraft[3] +
          serviceColorDraft[3];
      } else {
        setError(
          "Invalid color format. Please use a valid hex color (e.g., #FF0000)",
        );
        return;
      }
    }

    if (normalizedColor === (service.color ?? "#ffffff")) {
      // No changes to save, just return without showing a message
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
      // Update the draft with the normalized color
      setServiceColorDraft(normalizedColor);
      setSuccess("Color updated");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save color");
    } finally {
      setIsSavingColor(false);
    }
  };

  const saveQuickPrompts = async () => {
    if (!service?.id) {
      setError("Service not loaded. Please refresh the page.");
      return;
    }

    setError("");
    setSuccess("");

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
      setError(
        "Each quick prompt must have both title and message. Clear both fields to skip a row.",
      );
      return;
    }

    const cleanedPrompts = normalizedDraftPrompts.filter(
      (prompt) => prompt.title.length > 0 && prompt.prompt.length > 0,
    );

    // Check length limits
    const lengthInvalidPrompts = cleanedPrompts.filter(
      (prompt) => prompt.title.length > 100 || prompt.prompt.length > 1000,
    );

    if (lengthInvalidPrompts.length > 0) {
      setError(
        "Titles must be 100 characters or less, and messages must be 1000 characters or less.",
      );
      return;
    }

    if (cleanedPrompts.length === 0) {
      setError("Add at least one quick prompt before saving.");
      return;
    }

    if (cleanedPrompts.length > 10) {
      setError("Maximum 10 quick prompts allowed.");
      return;
    }

    const defaultPrompts = [
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
    ];

    // Fetch latest quickPrompts from backend list endpoint and compare to DB state
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
      // fall back to local service state if fetch fails
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
      setSuccess("No quick prompt changes to save.");
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
      setSuccess("Quick prompts updated");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save quick prompts");
    } finally {
      setIsSavingQuickPrompts(false);
    }
  };

  const saveEmbedOrigins = async () => {
    if (!service?.id) return;

    setError("");
    setSuccess("");

    if (invalidDraftOrigins.length > 0) {
      setError("Fix invalid origins before saving");
      return;
    }

    const normalized = validDraftOrigins;

    const current = Array.from(
      new Set((service.allowedOrigins ?? []).map((line) => line.toLowerCase())),
    );

    if (JSON.stringify(normalized) === JSON.stringify(current)) {
      setSuccess("No origin changes to save");
      return;
    }

    setIsSavingEmbedOrigins(true);
    try {
      const res = await fetch(`/api/service/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedOrigins: normalized }),
      });

      const data = (await res.json()) as { service?: Service; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save allowed origins");
      }

      const nextOrigins = data.service?.allowedOrigins ?? normalized;
      setService((prev) =>
        prev
          ? {
              ...prev,
              allowedOrigins: nextOrigins,
            }
          : prev,
      );
      setEmbedOriginsDraft(nextOrigins.join("\n"));
      setSuccess("Allowed origins updated");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save origins");
    } finally {
      setIsSavingEmbedOrigins(false);
    }
  };

  const saveGeminiApiKey = async () => {
    if (!service?.id) return;

    setError("");
    setSuccess("");
    const payload = geminiApiKeyDraft.trim();
    if (!payload) {
      setError("Enter a Gemini API key or use Remove key");
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
      setSuccess("Gemini API key saved");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to save Gemini API key",
      );
    } finally {
      setIsSavingGeminiApiKey(false);
    }
  };

  const removeGeminiApiKey = async () => {
    if (!service?.id) return;

    setError("");
    setSuccess("");
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
      setSuccess("Gemini API key removed");
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : "Failed to remove Gemini API key",
      );
    } finally {
      setIsSavingGeminiApiKey(false);
    }
  };

  const addEmbedOrigin = () => {
    setError("");
    const normalized = normalizeOriginLine(embedOriginInput);
    if (!normalized) {
      setError("Invalid origin. Use https://example.com or *.example.com");
      return;
    }

    if (validDraftOrigins.includes(normalized)) {
      setEmbedOriginInput("");
      return;
    }

    setEmbedOriginsDraft([...validDraftOrigins, normalized].join("\n"));
    setEmbedOriginInput("");
  };

  const removeEmbedOrigin = (originToRemove: string) => {
    const next = validDraftOrigins.filter((item) => item !== originToRemove);
    setEmbedOriginsDraft(next.join("\n"));
  };

  const deleteService = async () => {
    if (!service?.id) return;

    setIsDeletingService(true);
    setError("");
    setSuccess("");

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
      setError(e instanceof Error ? e.message : "Failed to delete service");
      setIsDeletingService(false);
    }
  };

  const ingestKnowledge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!service?.id) return;

    setError("");
    setSuccess("");

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
          serviceId: service.id,
          title: docTitle.trim() || undefined,
          text: docText,
        }),
      });

      const data = (await res.json()) as {
        chunksInserted?: number;
        totalChunks?: number;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to add knowledge");
      }

      setDocTitle("");
      setDocText("");
      setShowAddKnowledge(false);
      setSuccess(
        `Ingested ${data.chunksInserted ?? 0}/${data.totalChunks ?? 0} chunks`,
      );
      await loadKnowledge(service.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add knowledge");
    } finally {
      setIsIngesting(false);
    }
  };

  const revokeKnowledge = async (docId: string) => {
    if (!service?.id) return;
    setError("");
    setSuccess("");
    setBusyDocId(docId);
    setBusyDocAction("revoke");

    try {
      const res = await fetch(`/api/knowledge/${docId}`, {
        method: "PATCH",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke knowledge");
      }

      await loadKnowledge(service.id);
      setSuccess("Knowledge revoked");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to revoke knowledge");
    } finally {
      setBusyDocId("");
      setBusyDocAction("");
    }
  };

  const deleteKnowledge = async (docId: string) => {
    if (!service?.id) return;
    setError("");
    setSuccess("");
    setBusyDocId(docId);
    setBusyDocAction("delete");

    try {
      const res = await fetch(`/api/knowledge/${docId}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete knowledge");
      }

      await loadKnowledge(service.id);
      setSuccess("Knowledge deleted");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete knowledge");
    } finally {
      setBusyDocId("");
      setBusyDocAction("");
    }
  };

  const createApiKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!service?.id) return;

    setError("");
    setSuccess("");

    if (!apiKeyName.trim()) {
      setError("API key name is required");
      return;
    }

    setIsCreatingKey(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          name: apiKeyName.trim(),
        }),
      });

      const data = (await res.json()) as {
        apiKey?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Failed to create API key");
      }

      setApiKeyName("");
      setIsCreateApiKeyDialogOpen(false);
      setSuccess("API key created");
      await loadApiKeys(service.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    if (!service?.id) return;
    setError("");
    setSuccess("");
    setBusyKeyId(id);
    setBusyKeyAction("revoke");

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke API key");
      }

      await loadApiKeys(service.id);
      setSuccess("API key revoked");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to revoke API key");
    } finally {
      setBusyKeyId("");
      setBusyKeyAction("");
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!service?.id) return;
    setError("");
    setSuccess("");
    setBusyKeyId(id);
    setBusyKeyAction("delete");

    try {
      const res = await fetch(`/api/api-keys/${id}?hard=true`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete API key");
      }

      await loadApiKeys(service.id);
      setSuccess("API key deleted");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete API key");
    } finally {
      setBusyKeyId("");
      setBusyKeyAction("");
    }
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setSuccess("Copied to clipboard");
    } catch {
      setError("Failed to copy to clipboard");
    }
  };

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

              <TabsContent value="knowledge" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Context</CardTitle>
                    <CardDescription>
                      Add context to improve your AI responses.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAddKnowledge((v) => !v)}
                      >
                        {showAddKnowledge && <X />}
                        {showAddKnowledge ? "Close" : "Add context"}
                      </Button>
                    </div>

                    {showAddKnowledge ? (
                      <form onSubmit={ingestKnowledge} className="grid gap-3">
                        <div className="grid gap-2">
                          <Label htmlFor="doc-title">Title (optional)</Label>
                          <Input
                            id="doc-title"
                            value={docTitle}
                            onChange={(e) => setDocTitle(e.target.value)}
                            placeholder="Chapter 1"
                            disabled={isIngesting}
                            className="bg-background"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor="doc-text">Text</Label>
                          <Textarea
                            id="doc-text"
                            value={docText}
                            onChange={(e) => setDocText(e.target.value)}
                            placeholder="Paste your knowledge text"
                            disabled={isIngesting}
                            className="min-h-36 bg-background"
                          />
                        </div>

                        <Button
                          className="text-white"
                          type="submit"
                          disabled={isIngesting}
                        >
                          {isIngesting ? "Adding..." : "Add knowledge"}
                        </Button>
                      </form>
                    ) : isLoadingKnowledge ? (
                      <div className="grid gap-3">
                        {Array.from({ length: 1 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-30 animate-pulse rounded-md border bg-background"
                          />
                        ))}
                      </div>
                    ) : knowledgeDocs.length === 0 ? (
                      <div className="rounded-md border bg-background p-6 text-center">
                        <p className="text-base font-medium">
                          Add your context to your AI
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          No context yet. Add your first document.
                        </p>
                        <div className="mt-4">
                          <Button
                            className="text-white"
                            onClick={() => setShowAddKnowledge(true)}
                          >
                            Add context
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {knowledgeDocs.map((doc) => {
                          const isBusy = busyDocId === doc.id;
                          const isRevoked = Boolean(doc.revokedAt);
                          return (
                            <div
                              key={doc.id}
                              className="rounded-md border bg-background p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium">{doc.title}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Source: {doc.source}
                                  </p>
                                </div>
                                <span
                                  className={`text-xs font-medium ${isRevoked ? "text-red-500" : "text-green-600"}`}
                                >
                                  {isRevoked ? "Revoked" : "Active"}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={isBusy || isRevoked}
                                    >
                                      {isBusy && busyDocAction === "revoke"
                                        ? "Revoking..."
                                        : "Revoke"}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Revoke knowledge?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will remove the document context
                                        from your AI answers. You can add it
                                        again later.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="text-white"
                                        onClick={() =>
                                          void revokeKnowledge(doc.id)
                                        }
                                      >
                                        {isBusy && busyDocAction === "revoke"
                                          ? "Revoking..."
                                          : "Revoke"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      disabled={isBusy}
                                    >
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete knowledge?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        variant="destructive"
                                        onClick={() =>
                                          void deleteKnowledge(doc.id)
                                        }
                                      >
                                        {isBusy && busyDocAction === "delete"
                                          ? "Deleting..."
                                          : "Delete"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manage" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Edit and manage</CardTitle>
                    <CardDescription>
                      Update slug, description, and service settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
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
                        disabled={isSavingService || isDeletingService}
                        className="bg-background"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="service-description">Description</Label>
                      <Textarea
                        id="service-description"
                        value={serviceDescriptionDraft}
                        onChange={(e) =>
                          setServiceDescriptionDraft(e.target.value)
                        }
                        disabled={isSavingService || isDeletingService}
                        className="min-h-24 bg-background"
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label>System prompt</Label>
                        {isEditingSystemPrompt ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setServiceSystemPromptDraft(
                                service.systemPrompt ?? "",
                              );
                              setPromptBuilderDraft(
                                toPromptConfigDraft(service.promptConfig),
                              );
                              setSystemPromptEditorMode(
                                service.promptConfig ? "builder" : "text",
                              );
                              setIsEditingSystemPrompt(false);
                            }}
                            disabled={isSavingService || isDeletingService}
                          >
                            Close editor
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsEditingSystemPrompt(true)}
                            disabled={isSavingService || isDeletingService}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                      {isEditingSystemPrompt ? null : (
                        <div className="rounded-md border bg-background p-4">
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

                    {isEditingSystemPrompt ? (
                      <div className="grid gap-4 rounded-md bg-muted/20 px-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={
                              systemPromptEditorMode === "text"
                                ? "default"
                                : "outline"
                            }
                            className={
                              systemPromptEditorMode === "text"
                                ? "text-white"
                                : undefined
                            }
                            onClick={() => setSystemPromptEditorMode("text")}
                          >
                            Text area
                          </Button>
                          <Button
                            type="button"
                            variant={
                              systemPromptEditorMode === "builder"
                                ? "default"
                                : "outline"
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
                                You are editing the default prompt. Save to make
                                it your custom prompt.
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
                              disabled={isSavingService || isDeletingService}
                              className="min-h-32 bg-background"
                              placeholder="Leave empty to use default prompt"
                            />
                          </div>
                        ) : (
                          <div className="grid gap-3 border p-4 rounded-2xl">
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
                                disabled={isSavingService || isDeletingService}
                                className="bg-background"
                                placeholder="A helpful AI assistant..."
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="pb-instruction">
                                Instruction
                              </Label>
                              <Textarea
                                id="pb-instruction"
                                value={promptBuilderDraft.instruction}
                                onChange={(e) =>
                                  setPromptBuilderDraft((prev) => ({
                                    ...prev,
                                    instruction: e.target.value,
                                  }))
                                }
                                disabled={isSavingService || isDeletingService}
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
                                disabled={isSavingService || isDeletingService}
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
                                disabled={isSavingService || isDeletingService}
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
                                disabled={isSavingService || isDeletingService}
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
                                disabled={isSavingService || isDeletingService}
                                className="min-h-20 bg-background"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="pb-examples">
                                Examples (one per line)
                              </Label>
                              <Textarea
                                id="pb-examples"
                                value={promptBuilderDraft.examples}
                                onChange={(e) =>
                                  setPromptBuilderDraft((prev) => ({
                                    ...prev,
                                    examples: e.target.value,
                                  }))
                                }
                                disabled={isSavingService || isDeletingService}
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
                                disabled={isSavingService || isDeletingService}
                                className="min-h-20 bg-background"
                              />
                            </div>

                            <div className="grid gap-2">
                              <Label htmlFor="pb-reasoning">
                                Reasoning strategy
                              </Label>
                              <Input
                                id="pb-reasoning"
                                value={promptBuilderDraft.reasoningStrategy}
                                onChange={(e) =>
                                  setPromptBuilderDraft((prev) => ({
                                    ...prev,
                                    reasoningStrategy: e.target.value,
                                  }))
                                }
                                disabled={isSavingService || isDeletingService}
                                className="bg-background"
                                placeholder="RAG"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="rounded-md bg-muted/20 ">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">External Model Keys</p>
                          <p className="text-xs text-muted-foreground">
                            Configure how your service connects to AI models.
                            These keys belong to the service owner and are used
                            to fulfill completions.
                          </p>
                        </div>
                        <span
                          className={`text-xs font-medium ${service?.hasGeminiApiKey ? "text-green-600" : "text-muted-foreground"}`}
                        >
                          {service?.hasGeminiApiKey ? "Connected" : "Not set"}
                        </span>
                      </div>

                      <div className="rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
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
                                {new Date(
                                  service.geminiApiKeyUpdatedAt,
                                ).toLocaleString()}
                              </p>
                            ) : null}
                          </div>
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
                            onChange={(e) =>
                              setGeminiApiKeyDraft(e.target.value)
                            }
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

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="text-white"
                        onClick={() => void saveService()}
                        disabled={isSavingService || isDeletingService}
                      >
                        {isSavingService ? "Saving..." : "Save changes"}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={isSavingService || isDeletingService}
                          >
                            {isDeletingService
                              ? "Deleting..."
                              : "Delete service"}
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
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="appearance" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>
                      Customize the visual appearance of your service.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {error && (
                      <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                        <p className="text-sm text-destructive">{error}</p>
                      </div>
                    )}
                    {success && (
                      <div className="rounded-md border border-emerald-300/40 bg-emerald-500/10 p-3">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          {success}
                        </p>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="service-color">Color</Label>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void saveColor()}
                          disabled={isSavingColor || isDeletingService}
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
                              setError(""); // Clear any previous errors
                            }}
                            disabled={isSavingColor || isDeletingService}
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
                        Click the color square to open the color picker. This
                        color will be used in the chat interface.
                      </p>
                    </div>

                    <div className="grid gap-4 mt-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <Label className="text-base font-semibold">
                            Quick prompts
                          </Label>
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
                                    const newPrompts = [
                                      ...serviceQuickPromptsDraft,
                                    ];
                                    newPrompts[index].title = e.target.value;
                                    setServiceQuickPromptsDraft(newPrompts);
                                    setError(""); // Clear any previous errors
                                  }}
                                  disabled={
                                    isSavingQuickPrompts || isDeletingService
                                  }
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
                                    const newPrompts = [
                                      ...serviceQuickPromptsDraft,
                                    ];
                                    newPrompts[index].prompt = e.target.value;
                                    setServiceQuickPromptsDraft(newPrompts);
                                    setError(""); // Clear any previous errors
                                  }}
                                  disabled={
                                    isSavingQuickPrompts || isDeletingService
                                  }
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
                          disabled={isSavingQuickPrompts || isDeletingService}
                        >
                          {isSavingQuickPrompts ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>API</CardTitle>
                    <CardDescription>
                      Create and manage API keys.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6">
                    <div className="flex items-center justify-between gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline">
                            Instructions
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>How to use your API key</DialogTitle>
                            <DialogDescription>
                              Send requests to your chat API endpoint with your
                              API key in the request headers.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="grid gap-3 text-sm">
                            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                              <li>Create an API key from this tab.</li>
                              <li>
                                Send a POST request to {apiEndpoint} with header
                                x-api-key.
                              </li>
                              <li>
                                Include messages in the body. serviceId is
                                optional when key is tied to one service.
                              </li>
                            </ol>

                            <div className="rounded-md border bg-background p-3">
                              <p className="mb-2 text-xs font-medium text-muted-foreground">
                                Example request
                              </p>
                              <Textarea
                                readOnly
                                value={apiRequestExample}
                                className="min-h-44 bg-background font-mono text-xs resize-none"
                              />
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        open={isCreateApiKeyDialogOpen}
                        onOpenChange={(open) => {
                          setIsCreateApiKeyDialogOpen(open);
                          if (!open && !isCreatingKey) {
                            setApiKeyName("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button className="text-white" type="button">
                            Create API key
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create API key</DialogTitle>
                            <DialogDescription>
                              Give this key a name so you can identify it later.
                            </DialogDescription>
                          </DialogHeader>

                          <form onSubmit={createApiKey} className="grid gap-4">
                            <div className="grid gap-2">
                              <Label htmlFor="api-key-name">API key name</Label>
                              <Input
                                id="api-key-name"
                                value={apiKeyName}
                                onChange={(e) => setApiKeyName(e.target.value)}
                                placeholder="Production"
                                disabled={isCreatingKey}
                                className="bg-background"
                                autoFocus
                              />
                            </div>

                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isCreatingKey}
                                onClick={() =>
                                  setIsCreateApiKeyDialogOpen(false)
                                }
                              >
                                Cancel
                              </Button>
                              <Button
                                className="text-white"
                                type="submit"
                                disabled={isCreatingKey}
                              >
                                {isCreatingKey
                                  ? "Creating..."
                                  : "Create API key"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="rounded-md border bg-muted/20 p-4">
                      <p className="font-semibold">Service Access Keys</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Use these keys to authenticate your requests when
                        calling this service via the API. These are separate
                        from your AI model provider keys.
                      </p>
                    </div>

                    {isLoadingKeys ? (
                      <div className="grid gap-3">
                        {Array.from({ length: 1 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-30 animate-pulse rounded-md border bg-background"
                          />
                        ))}
                      </div>
                    ) : apiKeys.length === 0 ? (
                      <div className="rounded-xl flex flex-col items-center border bg-muted/20 p-5">
                        <p className="text-base font-semibold">
                          Connect your AI through API keys
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          You have no API keys yet. Create one to call your AI
                          from apps, backend services, or scripts.
                        </p>

                        <div className="mt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsCreateApiKeyDialogOpen(true)}
                          >
                            Create first API key
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {apiKeys.map((key) => {
                          const isBusy = busyKeyId === key.id;
                          const revoked = Boolean(key.revokedAt);
                          const maskedKey = `${key.prefix}...${key.last4}`;
                          const displayKey = key.apiKey || maskedKey;
                          const minuteUsed = key.usage?.minute?.count ?? 0;
                          const monthUsed = key.usage?.month?.count ?? 0;
                          const minuteLimit = key.rateLimitPerMinute;
                          const monthLimit = key.monthlyRequestLimit;

                          return (
                            <div
                              key={key.id}
                              className="rounded-md border bg-background p-4"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="font-medium">{key.name}</p>
                                  <div className="flex items-center gap-1">
                                    <p className="font-mono text-xs text-muted-foreground">
                                      {displayKey}
                                    </p>
                                    <button
                                      type="button"
                                      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                                      aria-label="Copy API key"
                                      onClick={() => void copyText(displayKey)}
                                      title="Copy API key"
                                    >
                                      <Copy className="size-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <span
                                  className={`text-xs font-medium ${revoked ? "text-red-500" : "text-green-600"}`}
                                >
                                  {revoked ? "Revoked" : "Active"}
                                </span>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {typeof minuteLimit === "number" ? (
                                  <span>
                                    Minute usage: {minuteUsed}/{minuteLimit}
                                  </span>
                                ) : null}
                                {typeof monthLimit === "number" ? (
                                  <span>
                                    Month usage: {monthUsed}/{monthLimit}
                                  </span>
                                ) : null}
                                {key.lastUsedAt ? (
                                  <span>
                                    Last used:{" "}
                                    {new Date(key.lastUsedAt).toLocaleString()}
                                  </span>
                                ) : (
                                  <span>Last used: Never</span>
                                )}
                              </div>

                              <div className="mt-3 flex flex-wrap justify-end gap-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={isBusy || revoked}
                                    >
                                      {isBusy && busyKeyAction === "revoke"
                                        ? "Revoking..."
                                        : "Revoke"}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Revoke API key?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This key will stop working immediately.
                                        You can still delete it afterwards.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() =>
                                          void revokeApiKey(key.id)
                                        }
                                      >
                                        {isBusy && busyKeyAction === "revoke"
                                          ? "Revoking..."
                                          : "Revoke"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      disabled={isBusy || !revoked}
                                    >
                                      Delete
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete key?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        You can only delete revoked keys.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        variant="destructive"
                                        onClick={() =>
                                          void deleteApiKey(key.id)
                                        }
                                      >
                                        {isBusy && busyKeyAction === "delete"
                                          ? "Deleting..."
                                          : "Delete"}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="embed" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Embed UI</CardTitle>
                    <CardDescription>
                      Use this to embed your chat widget on any website.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          1
                        </span>
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Link2 className="size-4" />
                          Embed URL
                        </Label>
                      </div>

                      <Textarea
                        readOnly
                        value={embedUrl}
                        className="min-h-24 bg-background font-mono text-xs resize-none"
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!embedUrl}
                          onClick={() => void copyText(embedUrl)}
                        >
                          Copy URL
                        </Button>
                        {embedUrl ? (
                          <Button asChild type="button" variant="outline">
                            <Link
                              href={embedUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open preview
                              <ExternalLink className="size-4" />
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          2
                        </span>
                        <Label className="flex items-center gap-2 text-sm font-medium">
                          <Code2 className="size-4" />
                          Script snippet
                        </Label>
                      </div>

                      <Textarea
                        readOnly
                        value={embedScript}
                        className="min-h-24 bg-background font-mono text-xs resize-none"
                      />

                      <div className="mt-3">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={!embedScript}
                          onClick={() => void copyText(embedScript)}
                        >
                          Copy snippet
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background p-4 lg:col-span-2">
                      <p className="text-sm font-medium">Allowed origins</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Restrict widget usage to specific domains. Empty list
                        means embed will be blocked.
                      </p>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Input
                          value={embedOriginInput}
                          onChange={(e) => setEmbedOriginInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addEmbedOrigin();
                            }
                          }}
                          placeholder="https://example.com or *.example.com"
                          className="font-mono text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addEmbedOrigin}
                        >
                          Add origin
                        </Button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {validDraftOrigins.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No allowed origins added yet.
                          </span>
                        ) : (
                          validDraftOrigins.map((item) => (
                            <span
                              key={item}
                              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1 font-mono text-xs"
                            >
                              {item}
                              <button
                                type="button"
                                className="rounded-sm p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
                                aria-label={`Remove ${item}`}
                                onClick={() => removeEmbedOrigin(item)}
                              >
                                <X className="size-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {invalidDraftOrigins.length > 0 ? (
                        <p className="mt-2 text-xs text-destructive">
                          Invalid entries: {invalidDraftOrigins.join(", ")}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => void saveEmbedOrigins()}
                          disabled={isSavingEmbedOrigins}
                          className="text-white"
                        >
                          {isSavingEmbedOrigins ? "Saving..." : "Save origins"}
                        </Button>
                        {validDraftOrigins.length > 0 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEmbedOriginsDraft("")}
                          >
                            Clear all
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background p-4 lg:col-span-2">
                      <p className="text-sm font-medium">How to embed</p>
                      <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                        <li>Copy the script snippet above.</li>
                        <li>
                          Paste it before the closing body tag of your website.
                        </li>
                        <li>Publish your website and test the widget.</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
