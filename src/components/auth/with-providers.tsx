import { redirect } from "next/navigation";
import { connection } from "next/server";

import { isGoogleSignInEnabled } from "@/lib/auth";
import { getEnv } from "@/env";
import { getCurrentUser } from "@/lib/auth/session";
import { emailVerificationRequired } from "@/lib/env/schema";

import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";

/** Request-time wrapper: already signed in -> dashboard; otherwise render the form. */
export async function AuthFormWithProviders({ form }: { form: "login" | "signup" }) {
  await connection();
  if (await getCurrentUser()) redirect("/dashboard");
  const googleEnabled = isGoogleSignInEnabled();
  return form === "login" ? (
    <LoginForm googleEnabled={googleEnabled} />
  ) : (
    <SignupForm
      googleEnabled={googleEnabled}
      verificationRequired={emailVerificationRequired(getEnv())}
    />
  );
}

export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className="space-y-4">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
          <div className="h-10 animate-pulse rounded-lg bg-white/5" />
        </div>
      ))}
      <div className="h-10 animate-pulse rounded-lg bg-white/10" />
    </div>
  );
}
