"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Check, Copy, RotateCcw, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";

type Service = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  quickPrompts?: Array<{
    title: string;
    prompt: string;
  }>;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  retryFor?: string;
};

export default function ChatClient({ slug }: { slug: string }) {
  const normalizedSlug = useMemo(() => slug ?? "", [slug]);

  const [service, setService] = useState<Service | null>(null);
  const [isLoadingService, setIsLoadingService] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const bottomAnchorRef = useRef<HTMLDivElement | null>(null);

  const focusChatInput = () => {
    const element = document.querySelector('[data-slot="input-group-control"]');
    if (element instanceof HTMLInputElement) {
      element.focus();
    }
  };

  const pushAssistantError = (message: string, retryFor?: string) => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: message, isError: true, retryFor },
    ]);
  };

  const quickPrompts = useMemo(() => {
    const dbPrompts =
      service?.quickPrompts && service.quickPrompts.length > 0
        ? service.quickPrompts
        : undefined;

    if (dbPrompts) return dbPrompts;

    return [
      {
        title: "Get started",
        prompt: `Tell me more about ${service?.name ?? "this service"}`,
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
  }, [service?.quickPrompts, service?.name]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoadingService(true);
      setService(null);
      setMessages([]);

      if (!normalizedSlug) {
        pushAssistantError("Missing service slug.");
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
        }
      } catch (e: unknown) {
        if (!cancelled) {
          pushAssistantError(
            e instanceof Error ? e.message : "Failed to load service",
          );
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

  useEffect(() => {
    if (!isLoadingService && service && !isSending) {
      const timeout = window.setTimeout(() => {
        focusChatInput();
      }, 0);

      return () => window.clearTimeout(timeout);
    }
  }, [isLoadingService, isSending, service]);

  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  const copyAssistantMessage = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      window.setTimeout(
        () => setCopiedIndex((prev) => (prev === idx ? null : prev)),
        1200,
      );
    } catch {
      // no-op
    }
  };

  const sendMessage = async () => {
    if (isSending) return;

    if (!service?.id) {
      pushAssistantError("Service not loaded.");
      return;
    }

    const text = input.trim();
    if (!text) return;

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
          embedReferrer:
            typeof window !== "undefined" ? window.location.href : "",
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
      pushAssistantError(
        e instanceof Error ? e.message : "Failed to send message",
        text,
      );
    } finally {
      setIsSending(false);
    }
  };

  const retryMessage = async (errorIndex: number, failedMessage: string) => {
    if (!service?.id || isSending || !failedMessage.trim()) return;

    const historyWithoutError = messages.filter((_, idx) => idx !== errorIndex);
    setMessages(historyWithoutError);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: failedMessage,
          serviceId: service.id,
          history: historyWithoutError,
          embedReferrer:
            typeof window !== "undefined" ? window.location.href : "",
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
      pushAssistantError(
        e instanceof Error ? e.message : "Failed to send message",
        failedMessage,
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-svh ">
      <div className="mx-auto flex h-svh w-full max-w-4xl flex-col px-4 pb-6 pt-4 sm:px-6 ">
        <Card className="flex h-full min-h-0 flex-1 flex-col border-0 bg-transparent -my-6">
          <CardHeader>
            <CardDescription>
              {isLoadingService
                ? "Loading service..."
                : service
                  ? `chat with ${service.name}`
                  : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-0">
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex min-h-full flex-col gap-4 px-6 pb-6 pt-4">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col justify-center my-auto pb-20 gap-6">
                    <div className="space-y-2 flex flex-col items-center">
                      <h2
                        className="text-4xl capitalize font-semibold text-foreground "
                        style={{ color: service?.color }}
                      >
                        {service?.name ?? "Start Chating"}
                      </h2>
                      <p className=" text-muted-foreground">
                        {service?.description?.trim()
                          ? service.description
                          : "Start the conversation by picking a prompt below or typing."}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 mt-5">
                      {quickPrompts.map((prompt) => (
                        <Card
                          key={prompt.title}
                          className="cursor-pointer transition hover:shadow-xl"
                          style={{
                            backgroundColor: service?.color + "10",
                            borderColor: service?.color + "20",
                          }}
                          onClick={() => {
                            setInput(prompt.prompt);
                            focusChatInput();
                          }}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle
                              className="text-sm"
                              style={{ color: service?.color }}
                            >
                              {prompt.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent
                            className="text-xs text-muted-foreground"
                            title={prompt.prompt}
                            style={{
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 1,
                              overflow: "hidden",
                            }}
                          >
                            {prompt.prompt}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          m.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                            m.role === "user"
                              ? "bg-accent text-primary-foreground"
                              : "bg-accent/20 text-secondary-foreground"
                          }`}
                          style={{
                            backgroundColor:
                              m.role === "user"
                                ? service?.color + "80"
                                : service?.color + "20",
                          }}
                        >
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          {m.role === "assistant" ? (
                            <div className="mt-2 flex justify-start">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs"
                                onClick={() =>
                                  void copyAssistantMessage(m.content, idx)
                                }
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="size-3.5" />
                                    Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="size-3.5" />
                                  </>
                                )}
                              </Button>
                              {m.isError && m.retryFor ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 px-2 text-xs"
                                  onClick={() =>
                                    void retryMessage(idx, m.retryFor as string)
                                  }
                                  disabled={isSending}
                                >
                                  <RotateCcw className="size-3.5" />
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {isSending ? (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-2xl bg-accent/20 px-4 py-3 text-sm text-secondary-foreground shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <span>Thinking</span>
                            <span className="inline-flex gap-1">
                              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                              <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                              <span className="size-1.5 animate-bounce rounded-full bg-current" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
                <div ref={bottomAnchorRef} />
              </div>
            </ScrollArea>

            <div className="sticky bottom-0 z-10 bg-background/95  backdrop-blur">
              <div className="mx-auto w-full max-w-4xl px-4 py-4">
                <InputGroup
                  className="h-12 rounded-xl border-primary bg-background shadow-md transition-shadow focus-within:shadow-lg"
                  style={{ borderTopColor: service?.color }}
                >
                  <InputGroupInput
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    autoFocus
                    disabled={isLoadingService || !service}
                    className="h-full px-4 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                  />
                  <InputGroupAddon align="inline-end" className="pr-2">
                    <InputGroupButton
                      style={{
                        backgroundColor: service?.color + "33",
                        borderRadius: "10px",
                      }}
                      type="button"
                      onClick={() => void sendMessage()}
                      disabled={
                        isLoadingService ||
                        !service ||
                        isSending ||
                        !input.trim()
                      }
                      size="sm"
                    >
                      <SendHorizontal
                        color={service?.color || "#98785d"}
                        className="h-10"
                      />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
