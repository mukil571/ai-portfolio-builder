"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

import { FormAlert } from "./form-bits";

export function ResendVerification() {
  const email = useSearchParams().get("email");
  const [state, setState] = useState<"idle" | "pending" | "sent" | "error">("idle");

  if (!email) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
        Open it to finish creating your account.
      </p>
      {state === "sent" ? <FormAlert tone="success">A new link is on its way.</FormAlert> : null}
      {state === "error" ? (
        <FormAlert tone="error">Couldn&apos;t send right now. Wait a minute and retry.</FormAlert>
      ) : null}
      <Button
        variant="outline"
        size="lg"
        className="h-10 w-full"
        disabled={state === "pending" || state === "sent"}
        onClick={async () => {
          setState("pending");
          const { error } = await authClient.sendVerificationEmail({
            email,
            callbackURL: "/dashboard",
          });
          setState(error ? "error" : "sent");
        }}
      >
        Resend the email
      </Button>
    </div>
  );
}
