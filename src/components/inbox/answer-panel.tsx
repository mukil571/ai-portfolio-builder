"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { answerQuestionAction, suggestAnswerAction } from "@/app/dashboard/sites/inbox-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Owner writes (or starts from an AI draft) the answer, chooses who may hear it, and
 * approves. Nothing reaches visitors until "Approve answer".
 */
export function AnswerPanel({
  question,
  suggestionsEnabled,
  onCancel,
  onDone,
}: {
  question: { id: string; question: string; waitingVisitors: number };
  suggestionsEnabled: boolean;
  onCancel: () => void;
  onDone: (message: string) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(question.question);
  const [answer, setAnswer] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [basedOn, setBasedOn] = useState<{ id: string; question: string }[] | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggesting, startSuggest] = useTransition();
  const [saving, startSave] = useTransition();

  function suggest() {
    setHint(null);
    setError(null);
    startSuggest(async () => {
      const r = await suggestAnswerAction({ questionId: question.id });
      if (!r.ok) {
        setHint(r.error);
        return;
      }
      if (!r.answer) {
        setBasedOn(null);
        setHint("Your knowledge base doesn't cover this yet, so write the answer yourself.");
        return;
      }
      setAnswer(r.answer);
      setBasedOn(r.basedOn);
    });
  }

  return (
    <form
      className="mt-4 space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startSave(async () => {
          const r = await answerQuestionAction({
            questionId: question.id,
            question: title,
            answer,
            visibility,
          });
          if (r.ok) onDone(r.message ?? "Saved.");
          else setError(r.error);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-q`}>Question</Label>
        <Input
          id={`${id}-q`}
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor={`${id}-a`}>Your answer</Label>
          {suggestionsEnabled ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={suggesting}
              onClick={suggest}
            >
              {suggesting ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles aria-hidden="true" />
              )}
              Suggest an answer
            </Button>
          ) : null}
        </div>
        <textarea
          id={`${id}-a`}
          value={answer}
          maxLength={2000}
          rows={3}
          placeholder="Write it the way you'd reply to the visitor."
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
        {basedOn?.length ? (
          <p className="text-xs text-muted-foreground">
            Draft based on your facts: {basedOn.map((f) => `“${f.question}”`).join(", ")}. Check it
            before approving.
          </p>
        ) : null}
        {hint ? (
          <p role="status" className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Who should get this answer?</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name={`${id}-v`}
            value="public"
            checked={visibility === "public"}
            onChange={() => setVisibility("public")}
            className="mt-1 accent-[var(--brand-from)]"
          />
          <span>
            Everyone
            <span className="block text-xs text-muted-foreground">
              Your assistant learns it and answers every future visitor.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name={`${id}-v`}
            value="private"
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
            className="mt-1 accent-[var(--brand-from)]"
          />
          <span>
            Only the people who asked
            <span className="block text-xs text-muted-foreground">
              Emailed to them; saved as a private fact the assistant never shares.
            </span>
          </span>
        </label>
        <p className="text-xs text-muted-foreground">
          {question.waitingVisitors
            ? `${question.waitingVisitors} visitor${question.waitingVisitors === 1 ? "" : "s"} asked to be emailed when you answer.`
            : "No visitor asked to be emailed for this one."}
        </p>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving || !answer.trim()}>
          {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Approve answer
        </Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
