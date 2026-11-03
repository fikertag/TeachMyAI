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
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { X } from "lucide-react";

import type { KnowledgeDocument } from "./types";

export function KnowledgeTabContent({
  serviceId,
  onError,
  onSuccess,
}: {
  serviceId: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [knowledgeDocs, setKnowledgeDocs] = useState<KnowledgeDocument[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(true);
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);
  const [busyDocId, setBusyDocId] = useState("");
  const [busyDocAction, setBusyDocAction] = useState<"revoke" | "delete" | "">(
    "",
  );

  const loadKnowledge = async () => {
    setIsLoadingKnowledge(true);
    try {
      const res = await fetch(`/api/knowledge?serviceId=${serviceId}`, {
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
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to load knowledge");
    } finally {
      setIsLoadingKnowledge(false);
    }
  };

  useEffect(() => {
    if (!serviceId) return;
    void loadKnowledge();
  }, [serviceId]);

  const ingestKnowledge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    onError("");

    if (!docText.trim()) {
      onError("Text is required");
      return;
    }

    setIsIngesting(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
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
      onSuccess(
        `Ingested ${data.chunksInserted ?? 0}/${data.totalChunks ?? 0} chunks`,
      );
      await loadKnowledge();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to add knowledge");
    } finally {
      setIsIngesting(false);
    }
  };

  const revokeKnowledge = async (docId: string) => {
    onError("");
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

      await loadKnowledge();
      onSuccess("Knowledge revoked");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to revoke knowledge");
    } finally {
      setBusyDocId("");
      setBusyDocAction("");
    }
  };

  const deleteKnowledge = async (docId: string) => {
    onError("");
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

      await loadKnowledge();
      onSuccess("Knowledge deleted");
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : "Failed to delete knowledge");
    } finally {
      setBusyDocId("");
      setBusyDocAction("");
    }
  };

  return (
    <TabsContent value="knowledge" className="">
      <Card>
        <CardHeader>
          <CardTitle>Context</CardTitle>
    
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddKnowledge((v) => !v)}
            >
              {showAddKnowledge && <X className="mr-1.5 h-4 w-4" />}
              {showAddKnowledge ? "Close" : "Add context"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">

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
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-md border bg-background p-4 animate-pulse space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-5 w-48 rounded bg-muted" />
                    <div className="h-4 w-14 rounded-full bg-muted/60" />
                  </div>
                  <div className="h-14 rounded border border-border/50 bg-muted/30 p-2 space-y-2">
                    <div className="h-2.5 w-full rounded bg-muted/60" />
                    <div className="h-2.5 w-4/5 rounded bg-muted/40" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-3 w-28 rounded bg-muted/50" />
                    <div className="flex gap-2">
                      <div className="h-8 w-16 rounded bg-muted/60" />
                      <div className="h-8 w-16 rounded bg-muted/40" />
                    </div>
                  </div>
                </div>
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
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium text-foreground">{doc.title}</p>
                        {doc.preview ? (
                          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 bg-muted/40 border border-border/50 rounded p-2 font-mono">
                            {doc.preview}
                            {doc.preview.length >= 240 ? "..." : ""}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-xs text-muted-foreground/80">
                          Source: {doc.source}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium shrink-0 ${isRevoked ? "text-red-500" : "text-green-600"}`}
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
                              This will remove the document context from your AI
                              answers. You can add it again later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="text-white"
                              onClick={() => void revokeKnowledge(doc.id)}
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
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              variant="destructive"
                              onClick={() => void deleteKnowledge(doc.id)}
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
  );
}
