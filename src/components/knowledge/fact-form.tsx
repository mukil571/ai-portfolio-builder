"use client";

import { Loader2 } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FactFormValues = {
  question: string;
  answer: string;
  visibility: "public" | "private";
  /** "YYYY-MM-DD" or "" */
  expiresAt: string;
};

export const emptyFact: FactFormValues = {
  question: "",
  answer: "",
  visibility: "public",
  expiresAt: "",
};

/** Add / edit form for one fact. `onSubmit` returns an error message or null. */
export function FactForm({
  initial = emptyFact,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: FactFormValues;
  submitLabel: string;
  onSubmit: (values: FactFormValues) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof FactFormValues>(k: K, v: FactFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const message = await onSubmit(values);
          if (message) setError(message);
          else if (!onCancel) setValues(emptyFact);
        });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`${id}-q`}>Question a visitor might ask</Label>
        <Input
          id={`${id}-q`}
          value={values.question}
          maxLength={300}
          placeholder="What is your hourly rate?"
          onChange={(e) => set("question", e.target.value)}
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-a`}>Your answer</Label>
        <textarea
          id={`${id}-a`}
          value={values.answer}
          maxLength={2000}
          rows={3}
          placeholder="My rate is $85/hour for freelance React work."
          onChange={(e) => set("answer", e.target.value)}
          className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <Label htmlFor={`${id}-v`}>Who can the assistant tell?</Label>
          <select
            id={`${id}-v`}
            value={values.visibility}
            onChange={(e) => set("visibility", e.target.value as FactFormValues["visibility"])}
            className="h-9 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="public">Any visitor</option>
            <option value="private">Private (not told to visitors yet)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-e`}>Expires on (optional)</Label>
          <Input
            id={`${id}-e`}
            type="date"
            value={values.expiresAt}
            onChange={(e) => set("expiresAt", e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
