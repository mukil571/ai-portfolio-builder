import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getEnv } from "@/env";
import { getDb } from "@/lib/db";
import { appBaseUrl, trustedOrigins } from "@/lib/env/schema";
import { accounts, sessions, users, verifications } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { resetPasswordMessage, verifyEmailMessage } from "@/lib/email/templates";
import { createFreeSubscription } from "@/lib/plans/subscriptions";

function createAuth() {
  const env = getEnv();
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

  return betterAuth({
    appName: "Loriyum",
    baseURL: appBaseUrl(env),
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(env),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      usePlural: true,
      // Neon WebSocket Pool supports real transactions (e.g. user + account on sign-up).
      transaction: true,
      schema: { users, sessions, accounts, verifications },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(resetPasswordMessage(user.email, url));
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail(verifyEmailMessage(user.email, user.name, url));
      },
    },
    socialProviders: googleEnabled
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID as string,
            clientSecret: env.GOOGLE_CLIENT_SECRET as string,
          },
        }
      : {},
    databaseHooks: {
      user: {
        create: {
          // Every account starts on the (fake) Free plan.
          after: async (user) => {
            await createFreeSubscription(user.id);
          },
        },
      },
    },
    // Must be last: lets server actions set auth cookies.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

/** Lazily built so `next build` never needs auth secrets (same pattern as getEnv/getDb). */
export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}

/** Whether Google sign-in is configured (the UI hides the button otherwise). */
export function isGoogleSignInEnabled(): boolean {
  const env = getEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
