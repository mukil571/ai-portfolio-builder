import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/auth-shell";
import { AuthFormWithProviders, FormSkeleton } from "@/components/auth/with-providers";

export const metadata: Metadata = { title: "Log in · Loriyum" };

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      description="Log in to manage your sites and answer visitor questions."
      footer={
        <>
          New to Loriyum?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <Suspense fallback={<FormSkeleton />}>
        <AuthFormWithProviders form="login" />
      </Suspense>
    </AuthShell>
  );
}
