"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { forgotPasswordSchema } from "@/lib/validation/auth";

import { Field, fieldErrors, FormAlert, SubmitButton } from "./form-bits";

export function ForgotPasswordForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setFailed(false);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    // Same message whether or not the account exists (no account enumeration).
    if (error && error.status !== 404) setFailed(true);
    else setSent(true);
  }

  if (sent) {
    return (
      <FormAlert tone="success">
        If an account exists for that email, a reset link is on its way. It expires in 1 hour.
      </FormAlert>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      {failed ? (
        <FormAlert tone="error">We couldn&apos;t send the email right now. Try again.</FormAlert>
      ) : null}
      <Field
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
        error={errors.email}
      />
      <SubmitButton pending={pending}>Send reset link</SubmitButton>
    </form>
  );
}
