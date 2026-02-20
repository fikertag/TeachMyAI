import Link from "next/link";
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
import { Code2, ExternalLink, Link2, X } from "lucide-react";

import type { Service } from "./types";

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

export function EmbedTabContent({
  service,
  origin,
  setService,
  onError,
  onSuccess,
}: {
  service: Service;
  origin: string;
  setService: React.Dispatch<React.SetStateAction<Service | null>>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [embedOriginsDraft, setEmbedOriginsDraft] = useState(
    (service.allowedOrigins ?? []).join("\n"),
  );
  const [embedOriginInput, setEmbedOriginInput] = useState("");
  const [isSavingEmbedOrigins, setIsSavingEmbedOrigins] = useState(false);

  const embedUrl = useMemo(() => {
    if (!service.id || !origin) return "";
    return `${origin}/embed/chat?service=${service.id}`;
  }, [origin, service.id]);

  const embedScript = useMemo(() => {
    if (!service.id || !origin) return "";
    return `<script src="${origin}/widget.js" data-service="${service.id}"><\/script>`;
  }, [origin, service.id]);

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

  useEffect(() => {
    setEmbedOriginsDraft((service.allowedOrigins ?? []).join("\n"));
  }, [service.allowedOrigins]);

  const saveEmbedOrigins = async () => {
    onError("");

    if (invalidDraftOrigins.length > 0) {
      onError("Fix invalid origins before saving");
      return;
    }

    const normalized = validDraftOrigins;

    const current = Array.from(
      new Set((service.allowedOrigins ?? []).map((line) => line.toLowerCase())),
    );

    if (JSON.stringify(normalized) === JSON.stringify(current)) {
      onSuccess("No origin changes to save");
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
      onSuccess("Allowed origins updated");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to save origins");
    } finally {
      setIsSavingEmbedOrigins(false);
    }
  };

  const addEmbedOrigin = () => {
    onError("");
    const normalized = normalizeOriginLine(embedOriginInput);
    if (!normalized) {
      onError("Invalid origin. Use https://example.com or *.example.com");
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

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onSuccess("Copied to clipboard");
    } catch {
      onError("Failed to copy to clipboard");
    }
  };

  return (
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
                  <Link href={embedUrl} target="_blank" rel="noreferrer">
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
              Restrict widget usage to specific domains. Empty list means embed
              will be blocked.
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
              <Button type="button" variant="outline" onClick={addEmbedOrigin}>
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
              <li>Paste it before the closing body tag of your website.</li>
              <li>Publish your website and test the widget.</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
