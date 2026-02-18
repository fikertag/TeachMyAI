export default function ServiceDetailsClient() {
  return null;
}
/*

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
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  description: string;
};

type KnowledgeDocument = {
  id: string;
  serviceId: string;
  title: string;
  source: string;
  revokedAt?: string;
  createdAt?: string;
};

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  revokedAt?: string;
  createdAt?: string;
};

export default function ServiceDetailsClient({
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
  const [isSavingService, setIsSavingService] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);

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
  const [createdKey, setCreatedKey] = useState("");
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

  const loadService = async () => {
    setIsLoadingService(true);
    setError("");

    try {
      const res = await fetch("/api/service", { method: "GET" });
      const data = (await res.json()) as { services?: Service[]; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Failed to load service");
      }

      const found = (data.services ?? []).find((s) => s.id === serviceId) ?? null;
      if (!found) {
        throw new Error("Service not found");
      }

      setService(found);
      setServiceSlugDraft(found.slug ?? "");
      setServiceDescriptionDraft(found.description ?? "");
    } catch (e: unknown) {
      setService(null);
      setError(e instanceof Error ? e.message : "Failed to load service");
    } finally {
      setIsLoadingService(false);
    }
  };

  const loadKnowledge = async (id: string) => {
    setIsLoadingKnowledge(true);
    try {
      const res = await fetch(`/api/knowledge?serviceId=${id}`, { method: "GET" });
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
  }, [serviceId]);

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

  const saveService = async () => {
    if (!service?.id) return;

    setError("");
    setSuccess("");

    const patch: Record<string, string> = {};
    const slugTrimmed = serviceSlugDraft.trim();

    if (slugTrimmed && slugTrimmed !== service.slug) {
      patch.slug = slugTrimmed;
    }

    if (serviceDescriptionDraft !== service.description) {
      patch.description = serviceDescriptionDraft;
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
        };
      });
      setSuccess("Service updated");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save service");
    } finally {
      setIsSavingService(false);
    }
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
+      setIsDeletingService(false);
+    }
+  };
+
+  const ingestKnowledge = async (event: React.FormEvent<HTMLFormElement>) => {
+    event.preventDefault();
+    if (!service?.id) return;
+
+    setError("");
+    setSuccess("");
+
+    if (!docText.trim()) {
+      setError("Text is required");
+      return;
+    }
+
+    setIsIngesting(true);
+    try {
+      const res = await fetch("/api/ingest", {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({
+          serviceId: service.id,
+          title: docTitle.trim() || undefined,
+          text: docText,
+        }),
+      });
+
+      const data = (await res.json()) as {
+        chunksInserted?: number;
+        totalChunks?: number;
+        error?: string;
+      };
+
+      if (!res.ok) {
+        throw new Error(data.error || "Failed to add knowledge");
+      }
+
+      setDocTitle("");
+      setDocText("");
+      setShowAddKnowledge(false);
+      setSuccess(
+        `Ingested ${data.chunksInserted ?? 0}/${data.totalChunks ?? 0} chunks`,
+      );
+      await loadKnowledge(service.id);
+    } catch (e: unknown) {
+      setError(e instanceof Error ? e.message : "Failed to add knowledge");
+    } finally {
+      setIsIngesting(false);
+    }
+  };
+
+  const revokeKnowledge = async (docId: string) => {
+    if (!service?.id) return;
+    setError("");
+    setSuccess("");
+    setBusyDocId(docId);
+    setBusyDocAction("revoke");
+
+    try {
+      const res = await fetch(`/api/knowledge/${docId}`, {
+        method: "PATCH",
+      });
+      const data = (await res.json()) as { ok?: boolean; error?: string };
+
+      if (!res.ok) {
+        throw new Error(data.error || "Failed to revoke knowledge");
+      }
+
+      await loadKnowledge(service.id);
+      setSuccess("Knowledge revoked");
+    } catch (e: unknown) {
+      setError(e instanceof Error ? e.message : "Failed to revoke knowledge");
+    } finally {
+      setBusyDocId("");
+      setBusyDocAction("");
+    }
+  };
+
+  const deleteKnowledge = async (docId: string) => {
+    if (!service?.id) return;
+    setError("");
+    setSuccess("");
+    setBusyDocId(docId);
+    setBusyDocAction("delete");
+
+    try {
+      const res = await fetch(`/api/knowledge/${docId}`, {
+        method: "DELETE",
+      });
+      const data = (await res.json()) as { ok?: boolean; error?: string };
+
+      if (!res.ok) {
+        throw new Error(data.error || "Failed to delete knowledge");
+      }
+
+      await loadKnowledge(service.id);
+      setSuccess("Knowledge deleted");
+    } catch (e: unknown) {
+      setError(e instanceof Error ? e.message : "Failed to delete knowledge");
+    } finally {
+      setBusyDocId("");
+      setBusyDocAction("");
+    }
+  };
+
+  const createApiKey = async (event: React.FormEvent<HTMLFormElement>) => {
+    event.preventDefault();
+    if (!service?.id) return;
+
+    setError("");
+    setSuccess("");
+    setCreatedKey("");
+
+    if (!apiKeyName.trim()) {
+      setError("API key name is required");
+      return;
+    }
+
+    setIsCreatingKey(true);
+    try {
+      const res = await fetch("/api/api-keys", {
+        method: "POST",
+        headers: { "Content-Type": "application/json" },
+        body: JSON.stringify({
+          serviceId: service.id,
+          name: apiKeyName.trim(),
+        }),
+      });
+
+      const data = (await res.json()) as {
+        apiKey?: string;
+        error?: string;
+      };
+
+      if (!res.ok) {
+        throw new Error(data.error || "Failed to create API key");
+      }
+
+      setApiKeyName("");
+      setCreatedKey(data.apiKey ?? "");
+      setSuccess("API key created");
+      await loadApiKeys(service.id);
+    } catch (e: unknown) {
+      setError(e instanceof Error ? e.message : "Failed to create API key");
+    } finally {
+      setIsCreatingKey(false);
+    }
+  };
+
+  const revokeApiKey = async (id: string) => {
+    if (!service?.id) return;
+    setError("");
+    setSuccess("");
+    setBusyKeyId(id);
+    setBusyKeyAction("revoke");
+
+    try {
+      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
+      const data = (await res.json()) as { ok?: boolean; error?: string };
+
+      if (!res.ok) {
+        throw new Error(data.error || "Failed to revoke API key");
+      }
+
+      await loadApiKeys(service.id);
+      setSuccess("API key revoked");
+    } catch (e: unknown) {
+      setError(e instanceof Error ? e.message : "Failed to revoke API key");
+    } finally {
+      setBusyKeyId("");
+      setBusyKeyAction("");
+    }
+  };
+
+  const deleteApiKey = async (id: string) => {
+    if (!service?.id) return;
+    setError("");
+    setSuccess("");
+    setBusyKeyId(id);
+    setBusyKeyAction("delete");
+
+    try {
+      const res = await fetch(`/api/api-keys/${id}?hard=true`, {
+        method: "DELETE",
+      });
+      const data = (await res.json()) as { ok?: boolean; error?: string };
+
+      if (!res.ok) {
+        throw new Error(data.error || "Failed to delete API key");
+      }
+
+      await loadApiKeys(service.id);
+      setSuccess("API key deleted");
+    } catch (e: unknown) {
+      setError(e instanceof Error ? e.message : "Failed to delete API key");
+    } finally {
+      setBusyKeyId("");
+      setBusyKeyAction("");
+    }
+  };
+
+  const copyText = async (value: string) => {
+    try {
+      await navigator.clipboard.writeText(value);
+      setSuccess("Copied to clipboard");
+    } catch {
+      setError("Failed to copy to clipboard");
+    }
+  };
+
+  return (
+    <div className="min-h-svh bg-muted">
+      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
+        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
+          <div>
+            <h1 className="text-2xl font-semibold tracking-tight">
+              Service details
+            </h1>
+            <p className="text-sm text-muted-foreground">
+              Manage your service actions and integrations.
+            </p>
+          </div>
+          <Button asChild variant="outline">
+            <Link href="/builder">Back</Link>
+          </Button>
+        </div>
+
+        {error || success ? (
+          <Card className="mb-6">
+            <CardContent className="pt-6">
+              {error ? <p className="text-sm text-destructive">{error}</p> : null}
+              {success ? <p className="text-sm text-primary">{success}</p> : null}
+            </CardContent>
+          </Card>
+        ) : null}
+
+        {isLoadingService ? (
+          <Card>
+            <CardHeader>
+              <CardTitle>Loading service</CardTitle>
+              <CardDescription>Please wait...</CardDescription>
+            </CardHeader>
+            <CardContent className="grid gap-3">
+              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
+              <div className="h-20 animate-pulse rounded bg-muted" />
+            </CardContent>
+          </Card>
+        ) : !service ? (
+          <Card>
+            <CardContent className="py-10">
+              <p className="text-sm text-muted-foreground">Service not found.</p>
+            </CardContent>
+          </Card>
+        ) : (
+          <div className="grid gap-6">
+            <Card>
+              <CardHeader>
+                <CardTitle>{service.name}</CardTitle>
+                <CardDescription>{service.description || "No description"}</CardDescription>
+              </CardHeader>
+              <CardContent className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
+                <span>Slug: /{service.slug}</span>
+                {aiLink ? (
+                  <Button asChild size="sm" className="ml-auto">
+                    <Link href={aiLink}>Open AI</Link>
+                  </Button>
+                ) : null}
+              </CardContent>
+            </Card>
+
+            <Tabs defaultValue="knowledge">
+              <TabsList>
+                <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
+                <TabsTrigger value="manage">Edit & Manage</TabsTrigger>
+                <TabsTrigger value="api">API</TabsTrigger>
+                <TabsTrigger value="embed">Embed</TabsTrigger>
+              </TabsList>
+
+              <TabsContent value="knowledge" className="mt-4">
+                <Card>
+                  <CardHeader>
+                    <CardTitle>Knowledge</CardTitle>
+                    <CardDescription>
+                      Add documents to improve your AI responses.
+                    </CardDescription>
+                  </CardHeader>
+                  <CardContent className="grid gap-4">
+                    <div className="flex justify-end">
+                      <Button
+                        type="button"
+                        variant="outline"
+                        onClick={() => setShowAddKnowledge((v) => !v)}
+                      >
+                        {showAddKnowledge ? "Close" : "Add knowledge"}
+                      </Button>
+                    </div>
+
+                    {showAddKnowledge ? (
+                      <form onSubmit={ingestKnowledge} className="grid gap-3">
+                        <div className="grid gap-2">
+                          <Label htmlFor="doc-title">Title (optional)</Label>
+                          <Input
+                            id="doc-title"
+                            value={docTitle}
+                            onChange={(e) => setDocTitle(e.target.value)}
+                            placeholder="Chapter 1"
+                            disabled={isIngesting}
+                            className="bg-background"
+                          />
+                        </div>
+
+                        <div className="grid gap-2">
+                          <Label htmlFor="doc-text">Text</Label>
+                          <Textarea
+                            id="doc-text"
+                            value={docText}
+                            onChange={(e) => setDocText(e.target.value)}
+                            placeholder="Paste your knowledge text"
+                            disabled={isIngesting}
+                            className="min-h-36 bg-background"
+                          />
+                        </div>
+
+                        <Button type="submit" disabled={isIngesting}>
+                          {isIngesting ? "Adding..." : "Add knowledge"}
+                        </Button>
+                      </form>
+                    ) : null}
+
+                    {isLoadingKnowledge ? (
+                      <div className="grid gap-3">
+                        {Array.from({ length: 3 }).map((_, i) => (
+                          <div
+                            key={i}
+                            className="h-24 animate-pulse rounded-md border bg-background"
+                          />
+                        ))}
+                      </div>
+                    ) : knowledgeDocs.length === 0 ? (
+                      <div className="rounded-md border bg-background p-6 text-center">
+                        <p className="text-base font-medium">
+                          Add your knowledge to your AI
+                        </p>
+                        <p className="mt-1 text-sm text-muted-foreground">
+                          No knowledge yet. Add your first document.
+                        </p>
+                        <div className="mt-4">
+                          <Button onClick={() => setShowAddKnowledge(true)}>
+                            Add knowledge
+                          </Button>
+                        </div>
+                      </div>
+                    ) : (
+                      <div className="grid gap-3">
+                        {knowledgeDocs.map((doc) => {
+                          const isBusy = busyDocId === doc.id;
+                          const isRevoked = Boolean(doc.revokedAt);
+                          return (
+                            <div
+                              key={doc.id}
+                              className="rounded-md border bg-background p-4"
+                            >
+                              <div className="flex flex-wrap items-center justify-between gap-2">
+                                <div>
+                                  <p className="font-medium">{doc.title}</p>
+                                  <p className="text-xs text-muted-foreground">
+                                    Source: {doc.source}
+                                  </p>
+                                </div>
+                                <span className="text-xs text-muted-foreground">
+                                  {isRevoked ? "Revoked" : "Active"}
+                                </span>
+                              </div>
+
+                              <div className="mt-3 flex flex-wrap gap-2">
+                                <Button
+                                  type="button"
+                                  variant="outline"
+                                  disabled={isBusy || isRevoked}
+                                  onClick={() => void revokeKnowledge(doc.id)}
+                                >
+                                  {isBusy && busyDocAction === "revoke"
+                                    ? "Revoking..."
+                                    : "Revoke"}
+                                </Button>
+
+                                <AlertDialog>
+                                  <AlertDialogTrigger asChild>
+                                    <Button
+                                      type="button"
+                                      variant="destructive"
+                                      disabled={isBusy}
+                                    >
+                                      Delete
+                                    </Button>
+                                  </AlertDialogTrigger>
+                                  <AlertDialogContent>
+                                    <AlertDialogHeader>
+                                      <AlertDialogTitle>
+                                        Delete knowledge?
+                                      </AlertDialogTitle>
+                                      <AlertDialogDescription>
+                                        This action cannot be undone.
+                                      </AlertDialogDescription>
+                                    </AlertDialogHeader>
+                                    <AlertDialogFooter>
+                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
+                                      <AlertDialogAction
+                                        variant="destructive"
+                                        onClick={() => void deleteKnowledge(doc.id)}
+                                      >
+                                        {isBusy && busyDocAction === "delete"
+                                          ? "Deleting..."
+                                          : "Delete"}
+                                      </AlertDialogAction>
+                                    </AlertDialogFooter>
+                                  </AlertDialogContent>
+                                </AlertDialog>
+                              </div>
+                            </div>
+                          );
+                        })}
+                      </div>
+                    )}
+                  </CardContent>
+                </Card>
+              </TabsContent>
+
+              <TabsContent value="manage" className="mt-4">
+                <Card>
+                  <CardHeader>
+                    <CardTitle>Edit and manage</CardTitle>
+                    <CardDescription>
+                      Update slug, description, and service settings.
+                    </CardDescription>
+                  </CardHeader>
+                  <CardContent className="grid gap-4">
+                    <div className="grid gap-2">
+                      <Label htmlFor="service-name">Name</Label>
+                      <Input
+                        id="service-name"
+                        value={service.name}
+                        readOnly
+                        disabled
+                        className="bg-background"
+                      />
+                    </div>
+
+                    <div className="grid gap-2">
+                      <Label htmlFor="service-slug">Slug</Label>
+                      <Input
+                        id="service-slug"
+                        value={serviceSlugDraft}
+                        onChange={(e) => setServiceSlugDraft(e.target.value)}
+                        disabled={isSavingService || isDeletingService}
+                        className="bg-background"
+                      />
+                    </div>
+
+                    <div className="grid gap-2">
+                      <Label htmlFor="service-description">Description</Label>
+                      <Textarea
+                        id="service-description"
+                        value={serviceDescriptionDraft}
+                        onChange={(e) => setServiceDescriptionDraft(e.target.value)}
+                        disabled={isSavingService || isDeletingService}
+                        className="min-h-24 bg-background"
+                      />
+                    </div>
+
+                    <div className="flex flex-wrap gap-2">
+                      <Button
+                        type="button"
+                        onClick={() => void saveService()}
+                        disabled={isSavingService || isDeletingService}
+                      >
+                        {isSavingService ? "Saving..." : "Save changes"}
+                      </Button>
+
+                      <AlertDialog>
+                        <AlertDialogTrigger asChild>
+                          <Button
+                            type="button"
+                            variant="destructive"
+                            disabled={isSavingService || isDeletingService}
+                          >
+                            {isDeletingService ? "Deleting..." : "Delete service"}
+                          </Button>
+                        </AlertDialogTrigger>
+                        <AlertDialogContent>
+                          <AlertDialogHeader>
+                            <AlertDialogTitle>Delete service?</AlertDialogTitle>
+                            <AlertDialogDescription>
+                              This will delete the service, keys, and knowledge.
+                            </AlertDialogDescription>
+                          </AlertDialogHeader>
+                          <AlertDialogFooter>
+                            <AlertDialogCancel>Cancel</AlertDialogCancel>
+                            <AlertDialogAction
+                              variant="destructive"
+                              onClick={() => void deleteService()}
+                            >
+                              Delete
+                            </AlertDialogAction>
+                          </AlertDialogFooter>
+                        </AlertDialogContent>
+                      </AlertDialog>
+                    </div>
+                  </CardContent>
+                </Card>
+              </TabsContent>
+
+              <TabsContent value="api" className="mt-4">
+                <Card>
+                  <CardHeader>
+                    <CardTitle>API</CardTitle>
+                    <CardDescription>Create and manage API keys.</CardDescription>
+                  </CardHeader>
+                  <CardContent className="grid gap-6">
+                    <form onSubmit={createApiKey} className="grid gap-3">
+                      <div className="grid gap-2">
+                        <Label htmlFor="api-key-name">API key name</Label>
+                        <Input
+                          id="api-key-name"
+                          value={apiKeyName}
+                          onChange={(e) => setApiKeyName(e.target.value)}
+                          placeholder="Production"
+                          disabled={isCreatingKey}
+                          className="bg-background"
+                        />
+                      </div>
+                      <Button type="submit" disabled={isCreatingKey}>
+                        {isCreatingKey ? "Creating..." : "Create API key"}
+                      </Button>
+                    </form>
+
+                    {createdKey ? (
+                      <div className="grid gap-2 rounded-md border bg-background p-4">
+                        <p className="text-sm font-medium">New API key (shown once)</p>
+                        <Textarea readOnly value={createdKey} className="bg-background" />
+                        <Button
+                          type="button"
+                          variant="outline"
+                          onClick={() => void copyText(createdKey)}
+                        >
+                          Copy key
+                        </Button>
+                      </div>
+                    ) : null}
+
+                    {isLoadingKeys ? (
+                      <div className="grid gap-3">
+                        {Array.from({ length: 2 }).map((_, i) => (
+                          <div
+                            key={i}
+                            className="h-20 animate-pulse rounded-md border bg-background"
+                          />
+                        ))}
+                      </div>
+                    ) : apiKeys.length === 0 ? (
+                      <p className="text-sm text-muted-foreground">
+                        No API keys yet.
+                      </p>
+                    ) : (
+                      <div className="grid gap-3">
+                        {apiKeys.map((key) => {
+                          const isBusy = busyKeyId === key.id;
+                          const revoked = Boolean(key.revokedAt);
+
+                          return (
+                            <div
+                              key={key.id}
+                              className="rounded-md border bg-background p-4"
+                            >
+                              <div className="flex items-center justify-between gap-2">
+                                <div>
+                                  <p className="font-medium">{key.name}</p>
+                                  <p className="text-xs text-muted-foreground">
+                                    {key.prefix}...{key.last4}
+                                  </p>
+                                </div>
+                                <span className="text-xs text-muted-foreground">
+                                  {revoked ? "Revoked" : "Active"}
+                                </span>
+                              </div>
+
+                              <div className="mt-3 flex flex-wrap gap-2">
+                                <Button
+                                  type="button"
+                                  variant="outline"
+                                  onClick={() => void revokeApiKey(key.id)}
+                                  disabled={isBusy || revoked}
+                                >
+                                  {isBusy && busyKeyAction === "revoke"
+                                    ? "Revoking..."
+                                    : "Revoke"}
+                                </Button>
+
+                                <AlertDialog>
+                                  <AlertDialogTrigger asChild>
+                                    <Button
+                                      type="button"
+                                      variant="destructive"
+                                      disabled={isBusy || !revoked}
+                                    >
+                                      Delete
+                                    </Button>
+                                  </AlertDialogTrigger>
+                                  <AlertDialogContent>
+                                    <AlertDialogHeader>
+                                      <AlertDialogTitle>Delete key?</AlertDialogTitle>
+                                      <AlertDialogDescription>
+                                        You can only delete revoked keys.
+                                      </AlertDialogDescription>
+                                    </AlertDialogHeader>
+                                    <AlertDialogFooter>
+                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
+                                      <AlertDialogAction
+                                        variant="destructive"
+                                        onClick={() => void deleteApiKey(key.id)}
+                                      >
+                                        {isBusy && busyKeyAction === "delete"
+                                          ? "Deleting..."
+                                          : "Delete"}
+                                      </AlertDialogAction>
+                                    </AlertDialogFooter>
+                                  </AlertDialogContent>
+                                </AlertDialog>
+                              </div>
+                            </div>
+                          );
+                        })}
+                      </div>
+                    )}
+                  </CardContent>
+                </Card>
+              </TabsContent>
+
+              <TabsContent value="embed" className="mt-4">
+                <Card>
+                  <CardHeader>
+                    <CardTitle>Embed UI</CardTitle>
+                    <CardDescription>
+                      Use this to embed your chat widget on any website.
+                    </CardDescription>
+                  </CardHeader>
+                  <CardContent className="grid gap-4">
+                    <div className="grid gap-2">
+                      <Label>Step 1 - Embed URL</Label>
+                      <Textarea readOnly value={embedUrl} className="min-h-16 bg-background" />
+                      <Button
+                        type="button"
+                        variant="outline"
+                        disabled={!embedUrl}
+                        onClick={() => void copyText(embedUrl)}
+                      >
+                        Copy URL
+                      </Button>
+                    </div>
+
+                    <div className="grid gap-2">
+                      <Label>Step 2 - Script snippet</Label>
+                      <Textarea
+                        readOnly
+                        value={embedScript}
+                        className="min-h-24 bg-background"
+                      />
+                      <Button
+                        type="button"
+                        variant="outline"
+                        disabled={!embedScript}
+                        onClick={() => void copyText(embedScript)}
+                      >
+                        Copy snippet
+                      </Button>
+                    </div>
+
+                    <p className="text-sm text-muted-foreground">
+                      Paste the script snippet before the closing body tag in your site.
+                    </p>
+                  </CardContent>
+                </Card>
+              </TabsContent>
+            </Tabs>
+          </div>
+        )}
+      </div>
+    </div>
+  );
+}
*/
