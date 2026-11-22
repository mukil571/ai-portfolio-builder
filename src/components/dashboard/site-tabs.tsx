import { BookOpenCheck, Bot, MessageCircleQuestion, Palette, PenLine } from "lucide-react";
import Link from "next/link";

import { cn } from "cn";

/** Tabs for a site's workspace pages (Knowledge Base, Questions). */
export function SiteTabs({
  siteId,
  current,
  openQuestions,
}: {
  siteId: string;
  current: "content" | "design" | "knowledge" | "questions" | "ai";
  openQuestions?: number;
}) {
  const tabs = [
    {
      key: "content",
      label: "Content",
      href: `/dashboard/sites/${siteId}/setup/content`,
      Icon: PenLine,
    },
    { key: "design", label: "Design", href: `/dashboard/sites/${siteId}/design`, Icon: Palette },
    {
      key: "knowledge",
      label: "Knowledge Base",
      href: `/dashboard/sites/${siteId}/knowledge`,
      Icon: BookOpenCheck,
    },
    {
      key: "questions",
      label: "Questions",
      href: `/dashboard/sites/${siteId}/questions`,
      Icon: MessageCircleQuestion,
    },
    { key: "ai", label: "AI & API", href: `/dashboard/sites/${siteId}/ai`, Icon: Bot },
  ] as const;
  return (
    <nav
      aria-label="Site workspace"
      className="mb-6 flex gap-1 overflow-x-auto border-b border-white/10"
    >
      {tabs.map(({ key, label, href, Icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={current === key ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            current === key
              ? "border-[var(--brand-from)] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
          {key === "questions" && openQuestions ? (
            <span className="rounded-full bg-[var(--brand-from)]/15 px-1.5 text-xs text-[var(--brand-from)]">
              {openQuestions}
              <span className="sr-only"> open</span>
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
