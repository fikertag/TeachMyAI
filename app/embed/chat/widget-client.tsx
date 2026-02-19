"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BotMessageSquare } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

export default function EmbedChatClient({ serviceId }: { serviceId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length, isSending]);

  const canSend = Boolean(serviceId) && input.trim().length > 0 && !isSending;

  const subtitle = useMemo(() => {
    if (!serviceId) return "Missing service id";
    return "Ask a question";
  }, [serviceId]);

  async function send() {
    if (!canSend) return;

    const text = input.trim();
    setInput("");

    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          messages: nextMessages,
          embedReferrer:
            (typeof document !== "undefined" ? document.referrer : "") ||
            (typeof window !== "undefined" ? window.location.href : ""),
        }),
      });

      const data = (await res.json()) as { response?: string; error?: unknown };

      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : "Failed to send message";
        throw new Error(msg);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(data.response ?? "") },
      ]);
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Failed to send message",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          padding: "12px 12px",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            height: 30,
            width: 30,
            borderRadius: 999,
            background: "#111",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BotMessageSquare size={16} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Chat </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{subtitle}</div>
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 12,
          background: "rgba(0,0,0,0.02)",
        }}
      >
        {messages.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            {serviceId ? "Send a message to start." : "Invalid embed URL."}
          </div>
        ) : null}

        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: isUser ? "flex-end" : "flex-start",
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: isUser ? "#111" : "#fff",
                  color: isUser ? "#fff" : "#111",
                  border: isUser ? "none" : "1px solid rgba(0,0,0,0.08)",
                  fontSize: 13,
                  lineHeight: 1.35,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {isSending ? (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-start",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 12px",
                borderRadius: 12,
                background: "#fff",
                color: "#111",
                border: "1px solid rgba(0,0,0,0.08)",
                fontSize: 13,
                lineHeight: 1.35,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>Thinking</span>
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-current" />
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        style={{
          padding: 12,
          borderTop: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
          disabled={!serviceId || isSending}
          placeholder={serviceId ? "Type a message" : "Missing service"}
          style={{
            flex: 1,
            height: 40,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            outline: "none",
            fontSize: 13,
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!canSend}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.15)",
            background: canSend ? "#111" : "#999",
            color: "#fff",
            cursor: canSend ? "pointer" : "not-allowed",
            fontSize: 13,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
