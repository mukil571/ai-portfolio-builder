"use client";

import { BadgeCheck, Info, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

type Kind =
  | "answer"
  | "general"
  | "redirect"
  | "unknown"
  | "not_configured"
  | "rate_limited"
  | "quota_exceeded"
  | "error";

type Message = {
  id: string;
  role: "visitor" | "assistant";
  text: string;
  kind?: Kind;
  label?: string;
  sources?: { id: string; question: string }[];
  unansweredQuestionId?: string;
};

type Meta = {
  type: "meta";
  kind: Kind;
  conversationId?: string;
  unansweredQuestionId?: string;
  label?: string;
  sources?: { id: string; question: string }[];
};
type Event = Meta | { type: "text"; delta: string } | { type: "done" };

const MAX_CHARS = 1000;
const newId = () => Math.random().toString(36).slice(2);

/** Visitor chat for a published site. Styled only with the template's --site-* tokens. */
export function ChatWidget({
  slug,
  owner,
  botName = null,
  greeting = null,
  widgetStyle = "mono",
}: {
  slug: string;
  owner: string;
  /** Owner-chosen assistant name; defaults to "{owner}'s assistant". */
  botName?: string | null;
  /** Owner-written first message; defaults to the standard greeting. */
  greeting?: string | null;
  /** "accent" colours the launcher, send button and visitor bubbles with the accent. */
  widgetStyle?: "mono" | "accent";
}) {
  const assistantName = botName || `${owner}'s assistant`;
  const panelId = useId();
  const storageKey = `loriyum-chat:${slug}`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const conversationId = useRef<string | undefined>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Restore this browser session's conversation.
  useEffect(() => {
    try {
      conversationId.current = sessionStorage.getItem(storageKey) ?? undefined;
    } catch {
      // Storage unavailable: start a new conversation.
    }
  }, [storageKey]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const reply: Message = { id: newId(), role: "assistant", text: "" };
    setMessages((m) => [...m, { id: newId(), role: "visitor", text }, reply]);
    const patch = (p: Partial<Message>) =>
      setMessages((m) => m.map((msg) => (msg.id === reply.id ? { ...msg, ...p } : msg)));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, message: text, conversationId: conversationId.current }),
      });
      if (!res.body || (!res.ok && !res.headers.get("content-type")?.includes("ndjson"))) {
        patch({ kind: "error", text: "Sorry, something went wrong. Please try again." });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as Event;
          if (event.type === "meta") {
            if (event.conversationId) {
              conversationId.current = event.conversationId;
              try {
                sessionStorage.setItem(storageKey, event.conversationId);
              } catch {
                // ignore
              }
            }
            patch({
              kind: event.kind,
              label: event.label,
              sources: event.sources,
              unansweredQuestionId: event.unansweredQuestionId,
            });
          } else if (event.type === "text") {
            acc += event.delta;
            patch({ text: acc });
          }
        }
      }
    } catch {
      patch({ kind: "error", text: "Sorry, we couldn't reach the assistant. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      data-chat-style={widgetStyle}
      className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 font-sans sm:right-6 sm:bottom-6"
    >
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={botName ? botName : `Ask ${owner}'s assistant`}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="flex h-[min(34rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-site-border bg-site-card text-site-fg shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-site-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {botName ? botName : `Ask ${owner}'s assistant`}
              </p>
              <p className="text-xs text-site-muted">
                Answers only from {owner}&apos;s approved info
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close chat"
              className="rounded-lg p-1.5 text-site-muted hover:text-site-fg focus-visible:outline-2 focus-visible:outline-site-accent"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm"
          >
            <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-site-border bg-site-bg px-3 py-2 leading-relaxed">
              {greeting ||
                `Hi! Ask me anything about ${owner}. If I don't know, I'll pass your question on.`}
            </p>
            {messages.map((m) =>
              m.role === "visitor" ? (
                <p
                  key={m.id}
                  className="chat-primary ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-site-fg px-3 py-2 leading-relaxed whitespace-pre-wrap text-site-bg"
                >
                  {m.text}
                </p>
              ) : (
                <AssistantBubble
                  key={m.id}
                  message={m}
                  owner={owner}
                  slug={slug}
                  conversationId={conversationId.current}
                />
              ),
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t border-site-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor={`${panelId}-input`} className="sr-only">
              Your question
            </label>
            <textarea
              id={`${panelId}-input`}
              ref={inputRef}
              rows={1}
              value={input}
              maxLength={MAX_CHARS}
              placeholder="Type your question…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="max-h-28 min-h-10 flex-1 resize-none rounded-xl border border-site-border bg-site-bg px-3 py-2 text-sm text-site-fg outline-none placeholder:text-site-muted focus-visible:border-site-accent"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="chat-primary flex size-10 shrink-0 items-center justify-center rounded-xl bg-site-fg text-site-bg transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-accent disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
            </button>
          </form>
        </div>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Close chat" : `Chat with ${assistantName}`}
        onClick={() => (open ? close() : setOpen(true))}
        className="chat-primary flex size-14 items-center justify-center rounded-full bg-site-fg text-site-bg shadow-xl transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-accent motion-reduce:transition-none motion-reduce:hover:scale-100"
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <MessageCircle className="size-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function AssistantBubble({
  message,
  owner,
  slug,
  conversationId,
}: {
  message: Message;
  owner: string;
  slug: string;
  conversationId?: string;
}) {
  if (!message.text && !message.kind) {
    return (
      <p className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md border border-site-border bg-site-bg px-3 py-2 text-site-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Checking {owner}&apos;s
        info…
      </p>
    );
  }
  return (
    <div className="max-w-[85%] space-y-2">
      <p className="rounded-2xl rounded-bl-md border border-site-border bg-site-bg px-3 py-2 leading-relaxed whitespace-pre-wrap">
        {message.text}
      </p>
      {message.kind === "answer" && message.sources?.length ? (
        <details className="text-xs text-site-muted">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border border-site-border px-2 py-0.5 [&::-webkit-details-marker]:hidden">
            <BadgeCheck className="size-3.5 text-site-accent" aria-hidden="true" />
            Verified by {owner}
          </summary>
          <ul className="mt-2 space-y-1 pl-1">
            {message.sources.map((s) => (
              <li key={s.id}>• {s.question}</li>
            ))}
          </ul>
        </details>
      ) : null}
      {message.kind === "general" && message.label ? (
        <p className="inline-flex items-center gap-1 rounded-full border border-site-border px-2 py-0.5 text-xs text-site-muted">
          <Info className="size-3.5" aria-hidden="true" />
          {message.label}
        </p>
      ) : null}
      {message.kind === "unknown" && message.unansweredQuestionId ? (
        <NotifyForm
          slug={slug}
          questionId={message.unansweredQuestionId}
          conversationId={conversationId}
        />
      ) : null}
    </div>
  );
}

function NotifyForm({
  slug,
  questionId,
  conversationId,
}: {
  slug: string;
  questionId: string;
  conversationId?: string;
}) {
  const id = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <p className="text-xs text-site-muted">
        Thanks — we&apos;ll email you when there&apos;s an answer.
      </p>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        setError(null);
        const res = await fetch("/api/chat/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, unansweredQuestionId: questionId, email, conversationId }),
        }).catch(() => null);
        if (res?.ok) return setState("done");
        const data = (await res?.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Couldn't save that. Please try again.");
        setState("error");
      }}
    >
      <label htmlFor={id} className="sr-only">
        Your email
      </label>
      <input
        id={id}
        type="email"
        required
        value={email}
        placeholder="you@email.com"
        onChange={(e) => setEmail(e.target.value)}
        className="h-8 min-w-0 flex-1 rounded-lg border border-site-border bg-site-bg px-2 text-xs text-site-fg outline-none focus-visible:border-site-accent"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="chat-primary h-8 shrink-0 rounded-lg bg-site-fg px-3 text-xs font-medium text-site-bg disabled:opacity-50"
      >
        Email me
      </button>
      {error ? (
        <p role="alert" className="sr-only">
          {error}
        </p>
      ) : null}
    </form>
  );
}
