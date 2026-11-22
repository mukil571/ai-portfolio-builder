"use client";

import {
  Check,
  CircleAlert,
  Clock,
  EyeOff,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import {
  addFactAction,
  approveFactAction,
  deleteFactAction,
  rejectFactAction,
  retryIndexingAction,
  suggestFromSiteAction,
  suggestFromTextAction,
  updateFactAction,
  uploadKnowledgeFileAction,
  type KnowledgeResult,
} from "@/app/dashboard/sites/knowledge-actions";
import { Button } from "@/components/ui/button";

import { FactForm, type FactFormValues } from "./fact-form";

export type FactView = {
  id: string;
  question: string;
  answer: string;
  status: "proposed" | "approved";
  visibility: "public" | "private";
  /** ISO date or null */
  expiresAt: string | null;
  searchable: boolean;
  source: string;
};

const sourceLabel: Record<string, string> = {
  manual: "Added by you",
  wizard: "From your site",
  file: "From a file",
  resume: "From pasted text",
  inbox: "From a visitor question",
};

const toForm = (f: FactView): FactFormValues => ({
  question: f.question,
  answer: f.answer,
  visibility: f.visibility,
  expiresAt: f.expiresAt ? f.expiresAt.slice(0, 10) : "",
});

/** Knowledge Base: review suggestions, manage approved facts, add and import. */
export function KnowledgeManager({
  siteId,
  facts,
  suggestionsEnabled,
}: {
  siteId: string;
  facts: FactView[];
  suggestionsEnabled: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const proposed = facts.filter((f) => f.status === "proposed");
  const approved = facts.filter((f) => f.status === "approved");
  const unsearchable = approved.filter((f) => !f.searchable).length;

  /** Runs an action, shows its message, refreshes server data. */
  function run(key: string, action: () => Promise<KnowledgeResult>) {
    setBusy(key);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (result.ok) {
        if (result.message) setNotice({ tone: "ok", text: result.message });
        router.refresh();
      } else {
        setNotice({ tone: "error", text: result.error });
      }
    });
  }

  async function submitThenRefresh(action: () => Promise<KnowledgeResult>): Promise<string | null> {
    const result = await action();
    if (!result.ok) return result.error;
    setNotice(result.message ? { tone: "ok", text: result.message } : null);
    setEditing(null);
    router.refresh();
    return null;
  }

  return (
    <div className="space-y-8">
      <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        Your assistant will only ever answer from{" "}
        <strong className="text-foreground">approved</strong> facts. Suggestions do nothing until
        you approve them.
      </p>

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

      {proposed.length ? (
        <section aria-labelledby="review-heading" className="space-y-3">
          <h2 id="review-heading" className="text-lg font-semibold tracking-tight">
            Needs your review <span className="text-muted-foreground">({proposed.length})</span>
          </h2>
          <ul className="space-y-3">
            {proposed.map((f) => (
              <li
                key={f.id}
                className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4"
              >
                {editing === f.id ? (
                  <FactForm
                    initial={toForm(f)}
                    submitLabel="Save"
                    onCancel={() => setEditing(null)}
                    onSubmit={(v) =>
                      submitThenRefresh(() => updateFactAction({ factId: f.id, ...v }))
                    }
                  />
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {sourceLabel[f.source] ?? f.source}
                    </p>
                    <p className="mt-1 font-medium">{f.question}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => run(f.id, () => approveFactAction({ factId: f.id }))}
                      >
                        {busy === f.id ? (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        ) : (
                          <Check aria-hidden="true" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() => setEditing(f.id)}
                      >
                        <Pencil aria-hidden="true" /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() => run(f.id, () => rejectFactAction({ factId: f.id }))}
                      >
                        <X aria-hidden="true" /> Reject
                      </Button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="approved-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="approved-heading" className="text-lg font-semibold tracking-tight">
            Approved facts <span className="text-muted-foreground">({approved.length})</span>
          </h2>
          {unsearchable ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => run("retry", () => retryIndexingAction({ siteId }))}
            >
              <RefreshCw
                aria-hidden="true"
                className={busy === "retry" ? "animate-spin" : undefined}
              />
              Retry indexing ({unsearchable})
            </Button>
          ) : null}
        </div>
        {approved.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-muted-foreground">
            No approved facts yet. Add one below, or import from text.
          </p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-2xl glass">
            {approved.map((f) => (
              <li key={f.id} className="p-4">
                {editing === f.id ? (
                  <FactForm
                    initial={toForm(f)}
                    submitLabel="Save"
                    onCancel={() => setEditing(null)}
                    onSubmit={(v) =>
                      submitThenRefresh(() => updateFactAction({ factId: f.id, ...v }))
                    }
                  />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{f.question}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {f.answer}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                        {f.visibility === "private" ? (
                          <Badge icon={<EyeOff className="size-3" aria-hidden="true" />}>
                            Not shared publicly
                          </Badge>
                        ) : null}
                        {f.expiresAt ? (
                          <Badge icon={<Clock className="size-3" aria-hidden="true" />}>
                            Expires {new Date(f.expiresAt).toLocaleDateString()}
                          </Badge>
                        ) : null}
                        {!f.searchable ? (
                          <Badge
                            tone="warn"
                            icon={<CircleAlert className="size-3" aria-hidden="true" />}
                          >
                            Not searchable yet
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Edit: ${f.question}`}
                        onClick={() => setEditing(f.id)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Delete: ${f.question}`}
                        disabled={busy !== null}
                        onClick={() => {
                          if (confirm("Delete this fact? Your assistant will stop using it.")) {
                            run(f.id, () => deleteFactAction({ factId: f.id }));
                          }
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="add-heading" className="rounded-2xl p-5 glass">
        <h2 id="add-heading" className="mb-4 text-lg font-semibold tracking-tight">
          Add a fact
        </h2>
        <FactForm
          submitLabel="Add fact"
          onSubmit={(v) => submitThenRefresh(() => addFactAction({ siteId, ...v }))}
        />
      </section>

      <ImportPanel siteId={siteId} suggestionsEnabled={suggestionsEnabled} busy={busy} run={run} />
    </div>
  );
}

function Badge({
  children,
  icon,
  tone,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  tone?: "warn";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
        tone === "warn" ? "bg-amber-400/10 text-amber-200" : "bg-white/10 text-muted-foreground"
      }`}
    >
      {icon}
      {children}
    </span>
  );
}

function ImportPanel({
  siteId,
  suggestionsEnabled,
  busy,
  run,
}: {
  siteId: string;
  suggestionsEnabled: boolean;
  busy: string | null;
  run: (key: string, action: () => Promise<KnowledgeResult>) => void;
}) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section aria-labelledby="import-heading" className="rounded-2xl p-5 glass">
      <h2 id="import-heading" className="text-lg font-semibold tracking-tight">
        Import facts
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Suggestions appear in “Needs your review”. Nothing is used until you approve it.
      </p>

      <div className="mt-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => run("site", () => suggestFromSiteAction({ siteId }))}
          >
            {busy === "site" ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles aria-hidden="true" />
            )}
            Suggest from my site content
          </Button>
          <span className="text-xs text-muted-foreground">
            Uses what you wrote in the Content step.
          </span>
        </div>

        {suggestionsEnabled ? (
          <>
            <div className="space-y-2">
              <label htmlFor="import-text" className="text-sm font-medium">
                Paste your resume, LinkedIn “About”, or any notes
              </label>
              <textarea
                id="import-text"
                value={text}
                maxLength={20_000}
                rows={6}
                onChange={(e) => setText(e.target.value)}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
              <Button
                disabled={busy !== null || text.trim().length < 40}
                onClick={() =>
                  run("text", async () => {
                    const result = await suggestFromTextAction({ siteId, text });
                    if (result.ok) setText("");
                    return result;
                  })
                }
              >
                {busy === "text" ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                Suggest facts
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                id="import-file"
                type="file"
                accept=".txt,text/plain"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.set("siteId", siteId);
                  form.set("file", file);
                  run("file", () => uploadKnowledgeFileAction(form));
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => fileRef.current?.click()}
              >
                {busy === "file" ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <FileText aria-hidden="true" />
                )}
                Upload a .txt file
              </Button>
              <span className="text-xs text-muted-foreground">
                Up to 200 KB. We read it, then discard the file.
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Suggesting facts from pasted text or files isn&apos;t set up yet. You can still add
            facts by hand.
          </p>
        )}
      </div>
    </section>
  );
}
