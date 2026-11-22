"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { deleteAccountAction } from "@/app/dashboard/sites/workspace-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Deletes the whole account after the owner types their email. */
export function DeleteAccount({ email }: { email: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-5">
      <h2 className="font-semibold tracking-tight">Delete my account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently deletes your account and every site, fact, question, conversation and visitor
        email in it. Live sites go offline immediately. This can&apos;t be undone, so download your
        data first if you want a copy.
      </p>
      {!open ? (
        <Button variant="outline" className="mt-4" onClick={() => setOpen(true)}>
          <Trash2 aria-hidden="true" /> Delete account…
        </Button>
      ) : (
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const r = await deleteAccountAction({ confirmEmail: typed });
              if (r && !r.ok) setError(r.error);
            });
          }}
        >
          <label htmlFor={id} className="block text-sm">
            Type your email <strong className="font-semibold break-all">{email}</strong> to confirm
          </label>
          <Input
            id={id}
            type="email"
            value={typed}
            autoComplete="off"
            onChange={(e) => setTyped(e.target.value)}
            className="h-9 max-w-sm"
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={!matches || pending}>
              {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Delete everything
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
