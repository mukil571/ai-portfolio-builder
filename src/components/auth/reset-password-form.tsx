"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { resetPasswordSchema } from "@/lib/validation/auth";

import { Field, fieldErrors, FormAlert, SubmitButton } from "./form-bits";

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token || linkError) {
    return (
      <FormAlert tone="error">
        This reset link is invalid or has expired.{" "}
        <Link href="/forgot-password" className="font-medium underline underline-offset-4">
          Request a new one
        </Link>
        .
      </FormAlert>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setAlert(null);
    setPending(true);
    const { error } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token: token as string,
    });
    if (!error) return router.replace("/login?reset=1");
    setPending(false);
    setAlert("This reset link is invalid or has expired. Request a new one.");
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4">
      {alert ? <FormAlert tone="error">{alert}</FormAlert> : null}
      <Field
        id="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.password}
        hint="At least 8 characters."
      />
      <Field
        id="confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        error={errors.confirm}
      />
      <SubmitButton pending={pending}>Update password</SubmitButton>
    </form>
  );
}
