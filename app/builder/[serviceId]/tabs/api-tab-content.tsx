import { useEffect, useState } from "react";

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
import { Copy } from "lucide-react";

import type { ApiKey } from "./types";

export function ApiTabContent({
  serviceId,
  apiEndpoint,
  apiRequestExample,
  onError,
  onSuccess,
}: {
  serviceId: string;
  apiEndpoint: string;
  apiRequestExample: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
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

  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const url = new URL("/api/api-keys", window.location.origin);
      url.searchParams.set("serviceId", serviceId);
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
    if (!serviceId) return;
    void loadApiKeys();
  }, [serviceId]);

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
          serviceId,
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
          <CardTitle>API</CardTitle>
          <CardDescription>Create and manage API keys.</CardDescription>
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
                    Send requests to your chat API endpoint with your API key in
                    the request headers.
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
                      Include messages in the body. serviceId is optional when
                      key is tied to one service.
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

          <div className="rounded-md border bg-muted/20 p-4">
            <p className="font-semibold">Service Access Keys</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use these keys to authenticate your requests when calling this
              service via the API. These are separate from your AI model
              provider keys.
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
                You have no API keys yet. Create one to call your AI from apps,
                backend services, or scripts.
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
                          Last used: {new Date(key.lastUsedAt).toLocaleString()}
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
                            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This key will stop working immediately. You can
                              still delete it afterwards.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => void revokeApiKey(key.id)}
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
                            <AlertDialogTitle>Delete key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              You can only delete revoked keys.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => void deleteApiKey(key.id)}
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
  );
}
