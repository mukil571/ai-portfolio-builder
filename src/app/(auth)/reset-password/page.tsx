import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FormSkeleton } from "@/components/auth/with-providers";

export const metadata: Metadata = { title: "Choose a new password · Loriyum" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="You'll be signed out of other devices after you update it."
    >
      <Suspense fallback={<FormSkeleton />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
