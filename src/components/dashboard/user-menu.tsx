import { requireUser } from "@/lib/auth/session";

import { SignOutButton } from "./sign-out-button";

/** Signed-in user + sign out. Reads the session: render inside <Suspense>. */
export async function UserMenu() {
  const user = await requireUser();
  const initial = (user.name || user.email).charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--brand-from)] to-[var(--brand-to)] text-sm font-semibold text-white"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1 text-sm leading-tight">
        <p className="truncate font-medium">{user.name}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <SignOutButton />
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="size-8 animate-pulse rounded-full bg-white/10" />
      <span className="h-8 flex-1 animate-pulse rounded bg-white/5" />
    </div>
  );
}
