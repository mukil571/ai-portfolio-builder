"use client";

import { EyeOff, Inbox, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import {
  deleteQuestionAction,
  mergeQuestionAction,
  setQuestionNotifyAction,
  setQuestionStatusAction,
  type InboxResult,
} from "@/app/dashboard/sites/inbox-actions";
import { Button } from "@/components/ui/button";
import { cn } from "cn";

import { AnswerPanel } from "./answer-panel";
import { MergeControl } from "./merge-control";

export type QuestionView = {
  id: string;
  question: string;
  askedCount: number;
  status: "open" | "answered" | "ignored";
  lastAsked: string;
  answered: string | null;
  waitingVisitors: number;
  merged: string[];
  answer: { question: string; answer: string; visibility: "public" | "private" } | null;
};

type Status = QuestionView["status"];
type Notice = { tone: "ok" | "error"; text: string } | null;

const statusTabs: { key: Status; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "answered", label: "Answered" },
  { key: "ignored", label: "Ignored" },
];

const emptyText: Record<Status, string> = {
  open: "No open questions. When a visitor asks something your assistant doesn't know, it shows up here.",
  answered: "Nothing answered yet.",
  ignored: "No ignored questions.",
};

const selectClass =
  "h-8 min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** Questions Inbox: filter/sort, notification setting, and per-question actions. */
export function QuestionsInbox({
  siteId,
  status,
  sort,
  counts,
  questions,
  notify,
  suggestionsEnabled,
}: {
  siteId: string;
  status: Status;
  sort: "asked" | "recent";
  counts: Record<Status, number>;
  questions: QuestionView[];
  notify: "instant" | "daily" | "off";
  suggestionsEnabled: boolean;
}) {
  const router = useRouter();
  const id = useId();
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [answering, setAnswering] = useState<string | null>(null);
  const [notifyValue, setNotifyValue] = useState(notify);
  const [, startTransition] = useTransition();
  const base = `/dashboard/sites/${siteId}/questions`;
  const href = (s: Status, o: "asked" | "recent") =>
    `${base}?status=${s}${o === "recent" ? "&sort=recent" : ""}`;

  function run(key: string, action: () => Promise<InboxResult>) {
    setBusy(key);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      setBusy(null);
      if (result.ok) {
        setNotice(result.message ? { tone: "ok", text: result.message } : null);
        router.refresh();
      } else {
        setNotice({ tone: "error", text: result.error });
      }
    });
  }

  const openOthers = questions.filter((q) => q.status === "open");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter questions" className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
          {statusTabs.map((t) => (
            <Link
              key={t.key}
              href={href(t.key, sort)}
              aria-current={status === t.key ? "page" : undefined}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                status === t.key
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label} <span className="text-muted-foreground">{counts[t.key]}</span>
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">Sort</span>
            <Link
              href={href(status, "asked")}
              aria-current={sort === "asked" ? "true" : undefined}
              className={
                sort === "asked" ? "font-medium" : "text-muted-foreground hover:text-foreground"
              }
            >
              Most asked
            </Link>
            <Link
              href={href(status, "recent")}
              aria-current={sort === "recent" ? "true" : undefined}
              className={
                sort === "recent" ? "font-medium" : "text-muted-foreground hover:text-foreground"
              }
            >
              Newest
            </Link>
          </span>
          <label htmlFor={`${id}-notify`} className="flex items-center gap-2">
            <span className="text-muted-foreground">Email me</span>
            <select
              id={`${id}-notify`}
              value={notifyValue}
              disabled={busy === "notify"}
              className={selectClass}
              onChange={(e) => {
                const value = e.target.value as typeof notify;
                setNotifyValue(value);
                run("notify", async () => {
                  const r = await setQuestionNotifyAction({ siteId, value });
                  return r.ok ? { ok: true, message: "Email setting saved." } : r;
                });
              }}
            >
              <option value="instant">For each new question</option>
              <option value="daily">Once a day (digest)</option>
              <option value="off">Never</option>
            </select>
          </label>
        </div>
      </div>

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

      {questions.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center">
          <Inbox className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{emptyText[status]}</p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label={`${status} questions`}>
          {questions.map((q) => (
            <li key={q.id} className="rounded-2xl border border-white/10 bg-card/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 font-medium break-words">{q.question}</p>
                <span
                  className="shrink-0 rounded-full bg-[var(--brand-from)]/15 px-2 py-0.5 text-xs font-medium text-[var(--brand-from)]"
                  title="How many times visitors asked this"
                >
                  Asked {q.askedCount}×
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Last asked {q.lastAsked}
                {q.answered ? ` · answered ${q.answered}` : ""}
                {q.waitingVisitors
                  ? ` · ${q.waitingVisitors} visitor${q.waitingVisitors === 1 ? "" : "s"} waiting for an email`
                  : ""}
              </p>
              {q.merged.length ? (
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer">Also asked as ({q.merged.length})</summary>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {q.merged.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {q.answer ? (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    Your answer ·{" "}
                    {q.answer.visibility === "public"
                      ? "the assistant tells any visitor"
                      : "private (emailed to the asker only)"}
                  </p>
                  <p className="mt-1 leading-relaxed">{q.answer.answer}</p>
                </div>
              ) : null}

              {answering === q.id ? (
                <AnswerPanel
                  question={q}
                  suggestionsEnabled={suggestionsEnabled}
                  onCancel={() => setAnswering(null)}
                  onDone={(message) => {
                    setAnswering(null);
                    setNotice({ tone: "ok", text: message });
                    router.refresh();
                  }}
                />
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {q.status === "open" ? (
                    <>
                      <Button size="sm" disabled={busy !== null} onClick={() => setAnswering(q.id)}>
                        Answer
                      </Button>
                      <MergeControl
                        question={q}
                        targets={openOthers.filter((o) => o.id !== q.id)}
                        disabled={busy !== null}
                        onMerge={(targetId) =>
                          run(q.id, () => mergeQuestionAction({ sourceId: q.id, targetId }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy !== null}
                        onClick={() =>
                          run(q.id, () =>
                            setQuestionStatusAction({ questionId: q.id, status: "ignored" }),
                          )
                        }
                      >
                        <EyeOff aria-hidden="true" /> Ignore
                      </Button>
                    </>
                  ) : null}
                  {q.status === "ignored" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy !== null}
                      onClick={() =>
                        run(q.id, () =>
                          setQuestionStatusAction({ questionId: q.id, status: "open" }),
                        )
                      }
                    >
                      <RotateCcw aria-hidden="true" /> Reopen
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy !== null}
                    aria-label={`Delete question: ${q.question}`}
                    onClick={() => {
                      const extra =
                        q.status === "answered"
                          ? " Your answer stays in the Knowledge Base."
                          : q.waitingVisitors
                            ? " Visitors waiting for an answer won't be emailed."
                            : "";
                      if (window.confirm(`Delete this question?${extra}`)) {
                        run(q.id, () => deleteQuestionAction({ questionId: q.id }));
                      }
                    }}
                  >
                    <Trash2 aria-hidden="true" /> Delete
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
