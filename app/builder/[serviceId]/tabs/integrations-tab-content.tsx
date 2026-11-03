import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Code2,
  Copy,
  ExternalLink,
  HelpCircle,
  KeyRound,
  Link2,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";

import type { ApiKey, Service } from "./types";

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

export function IntegrationsTabContent({
  service,
  origin,
  setService,
  apiEndpoint,
  apiRequestExample,
  onError,
  onSuccess,
}: {
  service: Service;
  origin: string;
  setService: React.Dispatch<React.SetStateAction<Service | null>>;
  apiEndpoint: string;
  apiRequestExample: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  // --- API Keys State ---
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [apiKeyName, setApiKeyName] = useState("");
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [isCreateApiKeyDialogOpen, setIsCreateApiKeyDialogOpen] =
    useState(false);
  const [busyKeyId, setBusyKeyId] = useState("");
  const [busyKeyAction, setBusyKeyAction] = useState<"revoke" | "delete" | "">(
    "",
  );

  // --- Embed State ---
  const [embedOriginsDraft, setEmbedOriginsDraft] = useState(
    (service.allowedOrigins ?? []).join("\n"),
  );
  const [embedOriginInput, setEmbedOriginInput] = useState("");
  const [isSavingEmbedOrigins, setIsSavingEmbedOrigins] = useState(false);

  // --- API Keys Logic ---
  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const url = new URL("/api/api-keys", window.location.origin);
      url.searchParams.set("serviceId", service.id);
      url.searchParams.set("includeUsage", "true");
      const res = await fetch(url.toString(), { method: "GET" });
      const data = (await res.json()) as { apiKeys?: ApiKey[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to load API keys");
      }

      setApiKeys(data.apiKeys ?? []);
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to load API keys");
    } finally {
      setIsLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (!service.id) return;
    void loadApiKeys();
  }, [service.id]);

  const createApiKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onError("");

    if (!apiKeyName.trim()) {
      onError("API key name is required");
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
      onSuccess("API key created");
      await loadApiKeys();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to create API key");
    } finally {
      setIsCreatingKey(false);
    }
  };

  const revokeApiKey = async (id: string) => {
    onError("");
    setBusyKeyId(id);
    setBusyKeyAction("revoke");

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke API key");
      }

      await loadApiKeys();
      onSuccess("API key revoked");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to revoke API key");
    } finally {
      setBusyKeyId("");
      setBusyKeyAction("");
    }
  };

  const deleteApiKey = async (id: string) => {
    onError("");
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

      await loadApiKeys();
      onSuccess("API key deleted");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to delete API key");
    } finally {
      setBusyKeyId("");
      setBusyKeyAction("");
    }
  };

  // --- Embed Logic ---
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
    <TabsContent value="api" className="mt-4">
      <Card>
        <CardHeader>
          <CardTitle>API & Embed</CardTitle>
          <CardDescription>
            Connect your AI service to apps, websites, and external platforms.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* SECTION 1: REST API Keys */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">REST API Keys</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Instructions Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      API Docs
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>How to use your API key</DialogTitle>
                      <DialogDescription>
                        Send requests to your chat API endpoint with your API key in the request headers.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-3 text-sm">
                      <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
                        <li>Create an API key below.</li>
                        <li>
                          Send a POST request to <code className="bg-muted px-1 py-0.5 rounded text-xs">{apiEndpoint}</code> with the header <code className="bg-muted px-1 py-0.5 rounded text-xs">x-api-key: your_key</code>.
                        </li>
                        <li>
                          Include messages in the body. The serviceId is automatically inferred from the key.
                        </li>
                      </ol>

                      <div className="rounded-md border bg-background p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Example cURL Request
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={() => void copyText(apiRequestExample)}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                        </div>
                        <Textarea
                          readOnly
                          value={apiRequestExample}
                          className="min-h-44 bg-muted/30 font-mono text-xs resize-none"
                        />
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Create Key Dialog */}
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
                    <Button size="sm" className="gap-1.5 text-white" type="button">
                      <Plus className="h-3.5 w-3.5" />
                      Create key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create API key</DialogTitle>
                      <DialogDescription>
                        Give this key a name so you can identify which application uses it.
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={createApiKey} className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="api-key-name">API key name</Label>
                        <Input
                          id="api-key-name"
                          value={apiKeyName}
                          onChange={(e) => setApiKeyName(e.target.value)}
                          placeholder="e.g. Portfolio Website, Production Backend"
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
                          onClick={() => setIsCreateApiKeyDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="text-white"
                          type="submit"
                          disabled={isCreatingKey}
                        >
                          {isCreatingKey ? "Creating..." : "Create API key"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="rounded-md border bg-background p-4 grid gap-3">
              <p className="text-xs text-muted-foreground">
                Use these keys to authenticate requests when calling this service via the REST API (<code className="font-mono text-xs">{apiEndpoint}</code>).
              </p>

              {isLoadingKeys ? (
                <div className="h-24 animate-pulse rounded-md bg-muted/50" />
              ) : apiKeys.length === 0 ? (
                <div className="rounded-lg flex flex-col items-center justify-center border border-dashed p-6 text-center">
                  <KeyRound className="h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-medium">No API keys created yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Generate an API key to call your AI service from any frontend, backend, or script.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => setIsCreateApiKeyDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create first API key
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2.5">
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
                        className="rounded-lg border bg-muted/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{key.name}</span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                revoked
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {revoked ? "Revoked" : "Active"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {displayKey}
                            </span>
                            <button
                              type="button"
                              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              aria-label="Copy API key"
                              onClick={() => void copyText(displayKey)}
                              title="Copy API key"
                            >
                              <Copy className="size-3.5" />
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                            {typeof minuteLimit === "number" ? (
                              <span>Min: {minuteUsed}/{minuteLimit}</span>
                            ) : null}
                            {typeof monthLimit === "number" ? (
                              <span>Month: {monthUsed}/{monthLimit}</span>
                            ) : null}
                            <span>
                              Last used:{" "}
                              {key.lastUsedAt
                                ? new Date(key.lastUsedAt).toLocaleDateString()
                                : "Never"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isBusy || revoked}
                                className="h-8 text-xs"
                              >
                                {isBusy && busyKeyAction === "revoke"
                                  ? "Revoking..."
                                  : "Revoke"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This key will stop working immediately. You can still delete it afterwards.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => void revokeApiKey(key.id)}
                                >
                                  Revoke
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={isBusy || !revoked}
                                className="h-8 text-xs"
                              >
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete key?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Permanently remove this revoked key record.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() => void deleteApiKey(key.id)}
                                >
                                  Delete
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
            </div>
          </div>

          {/* SECTION 2: Embed Widget */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">Embed Chat Widget</p>
            </div>

            <div className="rounded-md border bg-background p-4 grid gap-4 lg:grid-cols-2">
              {/* Embed URL */}
              <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold">
                    <Link2 className="size-3.5" />
                    Embed URL (Iframe / Direct link)
                  </Label>
                  {embedUrl ? (
                    <Button asChild size="sm" variant="ghost" className="h-6 text-xs gap-1">
                      <Link href={embedUrl} target="_blank" rel="noreferrer">
                        Preview
                        <ExternalLink className="size-3" />
                      </Link>
                    </Button>
                  ) : null}
                </div>

                <Textarea
                  readOnly
                  value={embedUrl}
                  className="min-h-18 bg-background font-mono text-xs resize-none"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!embedUrl}
                  onClick={() => void copyText(embedUrl)}
                  className="w-full gap-1.5"
                >
                  <Copy className="size-3.5" />
                  Copy Embed URL
                </Button>
              </div>

              {/* Script Snippet */}
              <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2.5">
                <Label className="flex items-center gap-1.5 text-xs font-semibold">
                  <Code2 className="size-3.5" />
                  HTML Script Tag (Popup Widget)
                </Label>

                <Textarea
                  readOnly
                  value={embedScript}
                  className="min-h-18 bg-background font-mono text-xs resize-none"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!embedScript}
                  onClick={() => void copyText(embedScript)}
                  className="w-full gap-1.5"
                >
                  <Copy className="size-3.5" />
                  Copy Script Snippet
                </Button>
              </div>
            </div>
          </div>

          {/* SECTION 3: Allowed Domains */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">Allowed Origins & Domains</p>
              </div>
              <span className="text-xs text-muted-foreground">
                {validDraftOrigins.length} domain{validDraftOrigins.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="rounded-md border bg-background p-4 grid gap-3">
              <p className="text-xs text-muted-foreground">
                Restrict widget embedding to specific domains for security. If empty, widget embedding will be blocked.
              </p>

              <div className="flex flex-col gap-2 sm:flex-row">
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
                  size="sm"
                  onClick={addEmbedOrigin}
                  className="shrink-0"
                >
                  Add domain
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 min-h-6">
                {validDraftOrigins.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">
                    No allowed domains added yet. Add your domain above to enable embedding.
                  </span>
                ) : (
                  validDraftOrigins.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 font-mono text-xs"
                    >
                      {item}
                      <button
                        type="button"
                        className="rounded-xs p-0.5 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
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
                <p className="text-xs text-destructive">
                  Invalid entries: {invalidDraftOrigins.join(", ")}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-2 pt-2 border-t">
                {validDraftOrigins.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setEmbedOriginsDraft("")}
                  >
                    Clear all
                  </Button>
                ) : <div />}

                <Button
                  type="button"
                  size="sm"
                  onClick={() => void saveEmbedOrigins()}
                  disabled={isSavingEmbedOrigins}
                  className="text-white"
                >
                  {isSavingEmbedOrigins ? "Saving..." : "Save domains"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}
