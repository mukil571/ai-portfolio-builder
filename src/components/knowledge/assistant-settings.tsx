"use client";

import { Bot } from "lucide-react";
import { useState, useTransition } from "react";

import { setAssistantAction } from "@/app/dashboard/sites/assistant-actions";

/** Per-site switch for the visitor assistant (beta: uses Loriyum's AI until Phase 8). */
export function AssistantSettings({
  siteId,
  initial,
  platformReady,
}: {
  siteId: string;
  initial: { enabled: boolean; allowGeneralAnswers: boolean };
  platformReady: boolean;
}) {
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: typeof settings) {
    const previous = settings;
    setSettings(next);
    setError(null);
    start(async () => {
      const result = await setAssistantAction({ siteId, ...next });
      if (!result.ok) {
        setSettings(previous);
        setError(result.error);
      }
    });
  }

  return (
    <section
      aria-labelledby="assistant-heading"
      className="rounded-2xl border border-white/10 bg-card/50 p-5"
    >
      <div className="flex items-start gap-3">
        <Bot className="mt-0.5 size-5 shrink-0 text-[var(--brand-from)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="assistant-heading" className="font-semibold tracking-tight">
            Site assistant <span className="text-xs font-normal text-muted-foreground">(beta)</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Shows a chat on your published site that answers only from your approved facts. Uses
            Loriyum&apos;s AI for now; your own key and plans come later.
          </p>
          {!platformReady ? (
            <p className="mt-2 text-sm text-amber-200">
              The assistant isn&apos;t available on this server yet.
            </p>
          ) : null}
          <div className="mt-4 space-y-3">
            <Toggle
              label="Enable assistant on my site"
              checked={settings.enabled}
              disabled={pending || !platformReady}
              onChange={(enabled) => save({ ...settings, enabled })}
            />
            <Toggle
              label="Also answer general tech questions (clearly labelled as not from you)"
              checked={settings.allowGeneralAnswers}
              disabled={pending || !settings.enabled}
              onChange={(allowGeneralAnswers) => save({ ...settings, allowGeneralAnswers })}
            />
          </div>
          {error ? (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 text-sm ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
          checked ? "bg-primary" : "bg-white/15"
        }`}
      >
        <span
          className={`inline-block size-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
