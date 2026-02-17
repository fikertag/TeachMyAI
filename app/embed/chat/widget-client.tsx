"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function EmbedChatClient({ serviceId }: { serviceId: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const canSend = Boolean(serviceId) && input.trim().length > 0 && !isSending;

  const subtitle = useMemo(() => {
    if (!serviceId) return "Missing service id";
    return "Ask a question";
  }, [serviceId]);

  async function send() {
    if (!canSend) return;

    const text = input.trim();
    setInput("");
    setError("");

    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, messages: nextMessages }),
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
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      style={{
        height: "100vh",
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
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>Chat</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{subtitle}</div>
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
      </div>

      {error ? (
        <div style={{ padding: "8px 12px", color: "#b00020", fontSize: 12 }}>
          {error}
        </div>
      ) : null}

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
          {isSending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
