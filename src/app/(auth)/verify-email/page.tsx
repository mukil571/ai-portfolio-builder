import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResendVerification } from "@/components/auth/resend-verification";

export const metadata: Metadata = { title: "Check your inbox · Loriyum" };

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Check your inbox"
      description="Confirm your email to finish creating your account. The link expires in 1 hour."
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to log in
        </Link>
      }
    >
      <Suspense fallback={null}>
        <ResendVerification />
      </Suspense>
    </AuthShell>
  );
}
