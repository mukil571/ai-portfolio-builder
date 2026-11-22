"use client";

import { Bot, Check, ExternalLink, KeyRound, Loader2, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import {
  deleteApiKeyAction,
  saveApiKeyAction,
  setAiModeAction,
  setByokModelAction,
  testSavedKeyAction,
  type AiResult,
} from "@/app/dashboard/sites/ai-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { modelCatalog, providerIds, type ProviderId } from "@/lib/ai/model-catalog";
import { cn } from "cn";

type Mode = "none" | "platform" | "byok";

export type AiPanelSettings = {
  mode: Mode;
  provider: ProviderId | null;
  model: string | null;
  keyLast4: string | null;
  allowGeneralAnswers: boolean;
};

const field =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** AI & API tab: choose how the assistant is powered, manage an own key. */
export function AiSettingsPanel({
  siteId,
  initial,
  platformReady,
  byokReady,
  planSummary,
}: {
  siteId: string;
  initial: AiPanelSettings;
  platformReady: boolean;
  byokReady: boolean;
  planSummary: React.ReactNode;
}) {
  const id = useId();
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const [provider, setProvider] = useState<ProviderId>(initial.provider ?? "google");
  const [model, setModel] = useState(
    initial.model ?? modelCatalog[initial.provider ?? "google"].models[0]!.id,
  );
  const [apiKey, setApiKey] = useState("");
  const hasKey = Boolean(initial.keyLast4);

  function run(key: string, action: () => Promise<AiResult>, after?: () => void) {
    setBusy(key);
    setNotice(null);
    start(async () => {
      const r = await action();
      setBusy(null);
      if (r.ok) {
        setNotice(r.message ? { tone: "ok", text: r.message } : null);
        after?.();
        router.refresh();
      } else setNotice({ tone: "error", text: r.error });
    });
  }

  const setMode = (mode: Mode) =>
    run("mode", () =>
      setAiModeAction({ siteId, mode, allowGeneralAnswers: initial.allowGeneralAnswers }),
    );

  const modes: { id: Mode; title: string; body: string; disabled?: string }[] = [
    { id: "none", title: "Off", body: "No chat on your site." },
    {
      id: "platform",
      title: "Loriyum's AI",
      body: "Nothing to set up. Uses your plan's monthly messages.",
      disabled: platformReady ? undefined : "Not available on this server.",
    },
    {
      id: "byok",
      title: "My own AI key",
      body: "Unlimited chats; your provider bills you directly.",
      disabled: hasKey ? undefined : "Save a key below first.",
    },
  ];

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          role={notice.tone === "error" ? "alert" : "status"}
          className={
            notice.tone === "error"
              ? "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              : "rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300"
          }
        >
          {notice.text}
        </p>
      ) : null}

      <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <Bot className="size-5 text-[var(--brand-from)]" aria-hidden="true" />
          How your assistant is powered
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Whichever you pick, it only ever answers from your approved facts.
        </p>
        <fieldset className="mt-4">
          <legend className="sr-only">AI mode</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {modes.map((m) => {
              const selected = initial.mode === m.id;
              return (
                <label
                  key={m.id}
                  className={cn(
                    "relative flex flex-col rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    selected ? "border-primary bg-primary/10" : "border-white/10",
                    m.disabled && !selected
                      ? "cursor-not-allowed opacity-60"
                      : "cursor-pointer hover:border-white/25",
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-mode`}
                    value={m.id}
                    checked={selected}
                    disabled={busy !== null || (Boolean(m.disabled) && !selected)}
                    onChange={() => setMode(m.id)}
                    className="sr-only"
                  />
                  <span className="font-medium">{m.title}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{m.body}</span>
                  {m.disabled && !selected ? (
                    <span className="mt-2 text-xs text-amber-200">{m.disabled}</span>
                  ) : null}
                  {selected ? (
                    <Check
                      className="absolute top-3 right-3 size-4 text-primary"
                      aria-hidden="true"
                    />
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={initial.allowGeneralAnswers}
            disabled={busy !== null || initial.mode === "none"}
            onChange={(e) =>
              run("general", () =>
                setAiModeAction({
                  siteId,
                  mode: initial.mode,
                  allowGeneralAnswers: e.target.checked,
                }),
              )
            }
            className="mt-0.5 accent-[var(--brand-from)]"
          />
          <span>
            Also answer general tech questions
            <span className="block text-xs text-muted-foreground">
              Clearly labelled as general info, never as coming from you.
            </span>
          </span>
        </label>
        {initial.mode === "platform" ? <div className="mt-5">{planSummary}</div> : null}
      </section>

      <section className="rounded-2xl border border-white/10 bg-card/50 p-5">
        <h2 className="flex items-center gap-2 font-semibold tracking-tight">
          <KeyRound className="size-5 text-[var(--brand-from)]" aria-hidden="true" />
          Your own AI key
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Stored encrypted. We only ever show its last 4 characters, and it&apos;s only used to answer
          your visitors.
        </p>

        {!byokReady ? (
          <p className="mt-4 text-sm text-amber-200">
            Saving your own key isn&apos;t available on this server yet.
          </p>
        ) : hasKey && initial.provider ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm">
              {modelCatalog[initial.provider].label} key ending in{" "}
              <span className="font-mono">••••{initial.keyLast4}</span>
            </p>
            <div className="max-w-sm space-y-2">
              <Label htmlFor={`${id}-saved-model`}>Model</Label>
              <select
                id={`${id}-saved-model`}
                value={initial.model ?? ""}
                disabled={busy !== null}
                onChange={(e) =>
                  run("model", () => setByokModelAction({ siteId, model: e.target.value }))
                }
                className={field}
              >
                {modelCatalog[initial.provider].models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy !== null}
                onClick={() => run("test", () => testSavedKeyAction({ siteId }))}
              >
                {busy === "test" ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                Test key
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy !== null}
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this key? If your site uses it, the chat turns off until you choose again.",
                    )
                  ) {
                    run("delete", () => deleteApiKeyAction({ siteId }));
                  }
                }}
              >
                <Trash2 aria-hidden="true" /> Delete key
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                "save",
                () => saveApiKeyAction({ siteId, provider, model, apiKey }),
                () => setApiKey(""),
              );
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`${id}-provider`}>Provider</Label>
                <select
                  id={`${id}-provider`}
                  value={provider}
                  onChange={(e) => {
                    const p = e.target.value as ProviderId;
                    setProvider(p);
                    setModel(modelCatalog[p].models[0]!.id);
                  }}
                  className={field}
                >
                  {providerIds.map((p) => (
                    <option key={p} value={p}>
                      {modelCatalog[p].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-0 space-y-2">
                <Label htmlFor={`${id}-model`}>Model</Label>
                <select
                  id={`${id}-model`}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={field}
                >
                  {modelCatalog[provider].models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${id}-key`}>API key</Label>
              <Input
                id={`${id}-key`}
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                placeholder={modelCatalog[provider].keyHint}
                onChange={(e) => setApiKey(e.target.value)}
                className="h-9 font-mono"
              />
              <a
                href={modelCatalog[provider].keysUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                Get a {modelCatalog[provider].label} key{" "}
                <ExternalLink className="size-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
            <Button type="submit" disabled={busy !== null || apiKey.trim().length < 10}>
              {busy === "save" ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Test and save key
            </Button>
            <p className="text-xs text-muted-foreground">
              We send one tiny test message first; the key is only saved if it works.
            </p>
          </form>
        )}
      </section>

      <p className="text-sm text-muted-foreground">
        Plans and monthly limits are on{" "}
        <Link href="/dashboard/plan" className="underline underline-offset-4">
          Plan &amp; usage
        </Link>
        .
      </p>
    </div>
  );
}
