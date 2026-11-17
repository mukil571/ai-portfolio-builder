"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/client";
import { signUpSchema } from "@/lib/validation/auth";

import { Field, fieldErrors, FormAlert, SubmitButton } from "./form-bits";
import { GoogleButton } from "./google-button";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) return setErrors(fieldErrors(parsed.error.issues));
    setErrors({});
    setAlert(null);
    setPending(true);

    const { error } = await authClient.signUp.email({ ...parsed.data, callbackURL: "/dashboard" });
    if (!error) {
      return router.push(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
    }
    setPending(false);
    if (error.status === 422 || error.code === "USER_ALREADY_EXISTS") {
      setAlert("An account with this email already exists. Try logging in instead.");
    } else if (error.status === 429) {
      setAlert("Too many attempts. Wait a minute and try again.");
    } else {
      setAlert("We couldn't create your account right now. Please try again.");
    }
  }

  return (
    <>
      {googleEnabled ? <GoogleButton next="/dashboard" /> : null}
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {alert ? <FormAlert tone="error">{alert}</FormAlert> : null}
        <Field id="name" label="Name" autoComplete="name" required error={errors.name} />
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
          autoComplete="new-password"
          required
          error={errors.password}
          hint="At least 8 characters."
        />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
    </>
  );
}
