"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { safeNext } from "@/lib/auth/redirects";
import { signInSchema } from "@/lib/validation/auth";

import { Field, fieldErrors, FormAlert, SubmitButton } from "./form-bits";
import { GoogleButton } from "./google-button";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<{ tone: "error" | "success"; text: string } | null>(
    params.get("reset") === "1"
      ? { tone: "success", text: "Password updated. Log in with your new password." }
      : null,
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signInSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setAlert(null);
    setPending(true);

    const { error } = await authClient.signIn.email({ ...parsed.data, callbackURL: next });
    if (!error) return router.replace(next);

    setPending(false);
    if (error.status === 403) {
      setAlert({
        tone: "error",
        text: "Please verify your email first. We've sent you a new confirmation link.",
      });
    } else if (error.status === 429) {
      setAlert({ tone: "error", text: "Too many attempts. Wait a minute and try again." });
    } else {
      setAlert({ tone: "error", text: "That email and password don't match an account." });
    }
  }

  return (
    <>
      {googleEnabled ? <GoogleButton next={next} /> : null}
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {alert ? <FormAlert tone={alert.tone}>{alert.text}</FormAlert> : null}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={errors.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          error={errors.password}
          hint={
            <Link
              href="/forgot-password"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot your password?
            </Link>
          }
        />
        <SubmitButton pending={pending}>Log in</SubmitButton>
      </form>
    </>
  );
}
