import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormWithProviders, FormSkeleton } from "@/components/auth/with-providers";

export const metadata: Metadata = { title: "Create account · Loriyum" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Build a site whose assistant only says what you approved."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <AuthFormWithProviders form="signup" />
      </Suspense>
    </AuthShell>
  );
}
