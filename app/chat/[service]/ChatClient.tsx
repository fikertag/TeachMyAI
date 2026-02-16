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

type Service = {
  id: string;
  name: string;
  slug: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatClient({ slug }: { slug: string }) {
  const normalizedSlug = useMemo(() => slug ?? "", [slug]);

  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);
  const [error, setError] = useState<string>("");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setError("");
      setIsLoadingService(true);
      setService(null);

      if (!normalizedSlug) {
        setError("Missing service slug");
        setIsLoadingService(false);
        return;
      }

      try {
        const res = await fetch("/api/service", { method: "GET" });
        const data = (await res.json()) as {
          services?: Service[];
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || "Failed to load services");
        }

        const match = (data.services ?? []).find(
          (s) => s.slug === normalizedSlug,
        );
        if (!match) {
          throw new Error(`Service not found for slug: ${normalizedSlug}`);
        }

        if (!cancelled) {
          setService(match);
          setMessages([]);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load service");
        }
      } finally {
        if (!cancelled) setIsLoadingService(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [normalizedSlug]);

  const sendMessage = async () => {
    if (!service?.id) {
      setError("Service not loaded");
      return;
    }

    const text = input.trim();
    if (!text) return;

    setError("");
    setIsSending(true);
    setInput("");

    const nextHistory: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextHistory);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          serviceId: service.id,
          history: nextHistory,
        }),
      });

      const data = (await res.json()) as { response?: string; error?: unknown };
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Chat request failed",
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: (data.response ?? "").toString(),
        },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-svh bg-muted">
      <div className="mx-auto w-full max-w-3xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>
              {isLoadingService
                ? "Loading service..."
                : service
                  ? `Service: ${service.name} (${service.slug})`
                  : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="grid gap-3 rounded-md border bg-background p-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Send a message to start the conversation.
                </p>
              ) : (
                <div className="grid gap-3">
                  {messages.map((m, idx) => (
                    <div key={idx} className="grid gap-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {m.role}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">
                        {m.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoadingService || !service || isSending}
                className="bg-background"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button
                type="button"
                onClick={() => void sendMessage()}
                disabled={
                  isLoadingService || !service || isSending || !input.trim()
                }
                className="w-full sm:w-auto"
              >
                {isSending ? "Sending..." : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
