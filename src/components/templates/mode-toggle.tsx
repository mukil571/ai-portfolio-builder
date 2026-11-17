"use client";

import { Moon, Sun } from "lucide-react";

import { SITE_MODE_KEY } from "./mode-key";

/**
 * Light/dark switch for a published site; persists the visitor's choice.
 * Stateless: it flips data-mode on the site root and CSS picks the icon, so the
 * server render and a saved preference applied before paint never disagree.
 */
export function ModeToggle({ rootId }: { rootId: string }) {
  function toggle() {
    const root = document.getElementById(rootId);
    if (!root) return;
    const next = root.dataset.mode === "dark" ? "light" : "dark";
    root.dataset.mode = next;
    try {
      localStorage.setItem(SITE_MODE_KEY, next);
    } catch {
      // Storage unavailable (private mode): the toggle still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle light and dark mode"
      className="inline-flex size-9 items-center justify-center rounded-lg border border-site-border text-site-muted transition-colors hover:text-site-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-site-accent"
    >
      <Moon className="size-4 in-data-[mode=dark]:hidden" aria-hidden="true" />
      <Sun className="hidden size-4 in-data-[mode=dark]:block" aria-hidden="true" />
    </button>
  );
}
