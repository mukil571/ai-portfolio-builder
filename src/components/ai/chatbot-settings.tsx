"use client";

import { Loader2, MessageCircle } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { saveChatbotSettingsAction } from "@/app/dashboard/sites/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Values = {
  botName: string;
  greeting: string;
  tone: "friendly" | "professional" | "concise";
  widgetStyle: "mono" | "accent";
};

const field =
  "h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Chatbot name, greeting, tone and widget colours (style only, never facts). */
export function ChatbotSettings({
  siteId,
  owner,
  initial,
}: {
  siteId: string;
  owner: string;
  initial: Values;
}) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setNotice(null);
    setValues((p) => ({ ...p, [k]: v }));
  };

  return (
    <section className="rounded-2xl p-5 glass">
      <h2 className="flex items-center gap-2 font-semibold tracking-tight">
        <MessageCircle className="size-5 text-[var(--brand-from)]" aria-hidden="true" />
        Chatbot
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How the chat looks and sounds. This never changes what it&apos;s allowed to say.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await saveChatbotSettingsAction({ siteId, ...values });
            if (r.ok) {
              setSaved(values);
              setNotice({ ok: true, text: r.message ?? "Saved." });
            } else setNotice({ ok: false, text: r.error });
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${id}-name`}>Name</Label>
            <Input
              id={`${id}-name`}
              value={values.botName}
              maxLength={40}
              placeholder={`${owner}'s assistant`}
              onChange={(e) => set("botName", e.target.value)}
              className="h-9"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor={`${id}-tone`}>Tone</Label>
            <select
              id={`${id}-tone`}
              value={values.tone}
              onChange={(e) => set("tone", e.target.value as Values["tone"])}
              className={field}
            >
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="concise">Short and to the point</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-greeting`}>First message</Label>
          <textarea
            id={`${id}-greeting`}
            value={values.greeting}
            maxLength={240}
            rows={2}
            placeholder={`Hi! Ask me anything about ${owner}. If I don't know, I'll pass your question on.`}
            onChange={(e) => set("greeting", e.target.value)}
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <p className="text-xs text-muted-foreground">
            Don&apos;t put facts here (like prices): greetings aren&apos;t checked like answers.
          </p>
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Chat colours</legend>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            {(
              [
                ["mono", "Match my site's text colour"],
                ["accent", "Use my accent colour"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`${id}-style`}
                  value={value}
                  checked={values.widgetStyle === value}
                  onChange={() => set("widgetStyle", value)}
                  className="accent-[var(--brand-from)]"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || !dirty}>
            {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Save chatbot
          </Button>
          {notice ? (
            <p
              role={notice.ok ? "status" : "alert"}
              className={`text-sm ${notice.ok ? "text-emerald-300" : "text-destructive"}`}
            >
              {notice.text}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
