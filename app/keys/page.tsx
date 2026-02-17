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
import { Textarea } from "@/components/ui/textarea";
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

type Service = {
  id: string;
  name: string;
  slug: string;
};

type ApiKey = {
  id: string;
  serviceId: string;
  name: string;
  prefix: string;
  last4: string;
  monthlyRequestLimit?: number;
  usage?: {
    month?: { windowStart: string; count: number };
  };
  revokedAt?: string;
  lastUsedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CreateResponse = {
  apiKey?: string;
  apiKeyMeta?: ApiKey;
  error?: string;
};

export default function ApiKeysPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [createdKey, setCreatedKey] = useState<string>("");

  const selectedService = useMemo(() => {
    return services.find((s) => s.id === selectedServiceId) ?? null;
  }, [selectedServiceId, services]);

  const loadServices = async () => {
    const res = await fetch("/api/service", { method: "GET" });
    const data = (await res.json()) as { services?: Service[]; error?: string };

    if (!res.ok) {
      throw new Error(data.error || "Failed to load services");
    }

    setServices(data.services ?? []);
    if (!selectedServiceId && (data.services?.length ?? 0) > 0) {
      setSelectedServiceId(data.services![0].id);
    }
  };

  const loadKeys = async (serviceId?: string) => {
    const url = new URL("/api/api-keys", window.location.origin);
    if (serviceId) url.searchParams.set("serviceId", serviceId);
    url.searchParams.set("includeUsage", "true");

    const res = await fetch(url.toString(), { method: "GET" });
    const data = (await res.json()) as { apiKeys?: ApiKey[]; error?: string };

    if (!res.ok) {
      throw new Error(data.error || "Failed to load API keys");
    }

    setApiKeys(data.apiKeys ?? []);
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setError("");
      setSuccess("");
      setIsLoading(true);

      try {
        await loadServices();
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load services");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedServiceId) return;

    let cancelled = false;
    const run = async () => {
      setError("");
      setSuccess("");
      try {
        await loadKeys(selectedServiceId);
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load API keys");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [selectedServiceId]);

  const createKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setCreatedKey("");

    if (!selectedServiceId) {
      setError("Select a service first");
      return;
    }

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          name: name.trim(),
        }),
      });

      const data = (await res.json()) as CreateResponse;

      if (!res.ok) {
        throw new Error(data.error || "Failed to create key");
      }

      setCreatedKey(data.apiKey ?? "");
      setName("");
      await loadKeys(selectedServiceId);
      setSuccess("API key created. Copy it now — it will not be shown again.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setIsCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    setError("");
    setSuccess("");

    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    const data = (await res.json()) as { ok?: boolean; error?: string };

    if (!res.ok) {
      setError(data.error || "Failed to revoke key");
      return;
    }

    await loadKeys(selectedServiceId);
    setSuccess("API key revoked");
  };

  const deleteKey = async (id: string) => {
    setError("");
    setSuccess("");

    const res = await fetch(`/api/api-keys/${id}?hard=true`, {
      method: "DELETE",
    });
    const data = (await res.json()) as { ok?: boolean; error?: string };

    if (!res.ok) {
      setError(data.error || "Failed to delete key");
      return;
    }

    await loadKeys(selectedServiceId);
    setSuccess("API key deleted");
  };

  const usageSnippet = useMemo(() => {
    if (!selectedService) return "";

    return `curl -X POST ${window.location.origin}/api/chat \\\n  -H 'Content-Type: application/json' \\\n  -H 'x-api-key: YOUR_API_KEY' \\\n  -d '{"serviceId":"${selectedService.id}","message":"Hello"}'`;
  }, [selectedService]);

  return (
    <div className="min-h-svh bg-muted">
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Create keys for your service and set usage limits.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {success ? (
              <p className="text-sm text-foreground">{success}</p>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="service">Service</Label>
              <select
                id="service"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                disabled={isLoading || services.length === 0}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {services.length === 0 ? (
                  <option value="">No services found</option>
                ) : null}
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.slug})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                If you’re not signed in, this page will show Unauthorized.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Create API Key</CardTitle>
                <CardDescription>
                  Limits are managed by TeachMyAI.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createKey} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Production"
                      disabled={isCreating}
                      className="bg-background"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={
                      isCreating ||
                      isLoading ||
                      !selectedServiceId ||
                      !name.trim()
                    }
                  >
                    {isCreating ? "Creating..." : "Create key"}
                  </Button>

                  {createdKey ? (
                    <div className="grid gap-2">
                      <Label htmlFor="created">Your API key (shown once)</Label>
                      <Textarea
                        id="created"
                        readOnly
                        value={createdKey}
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          await navigator.clipboard.writeText(createdKey);
                          setSuccess("Copied API key to clipboard");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  ) : null}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Use in API</CardTitle>
                <CardDescription>
                  Send requests with <code>x-api-key</code> (or Authorization:
                  Bearer).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Textarea
                  readOnly
                  value={usageSnippet}
                  className="bg-background"
                />
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Existing keys</h2>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!selectedServiceId}
                  onClick={() => void loadKeys(selectedServiceId)}
                >
                  Refresh
                </Button>
              </div>

              {apiKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keys yet.</p>
              ) : (
                <div className="grid gap-4">
                  {apiKeys.map((k) => {
                    const isRevoked = Boolean(k.revokedAt);
                    const monthCount = k.usage?.month?.count ?? 0;
                    return (
                      <Card key={k.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{k.name}</CardTitle>
                          <CardDescription>
                            {k.prefix}…{k.last4} {isRevoked ? "(revoked)" : ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                              <Label>Name</Label>
                              <Input
                                value={k.name}
                                disabled={isRevoked}
                                className="bg-background"
                                onChange={(e) => {
                                  setApiKeys((prev) =>
                                    prev.map((x) =>
                                      x.id === k.id
                                        ? { ...x, name: e.target.value }
                                        : x,
                                    ),
                                  );
                                }}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>Monthly usage</Label>
                              <Input
                                readOnly
                                value={
                                  typeof k.monthlyRequestLimit === "number"
                                    ? `${monthCount}/${k.monthlyRequestLimit} this month`
                                    : `${monthCount} this month`
                                }
                                className="bg-background"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            {!isRevoked ? (
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() => void revokeKey(k.id)}
                              >
                                Revoke
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button type="button" variant="destructive">
                                    Delete permanently
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete API key?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete the key and
                                      its usage counters. This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      variant="destructive"
                                      onClick={() => void deleteKey(k.id)}
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void loadKeys(selectedServiceId)}
                            >
                              Refresh usage
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
