import {
  BarChart3,
  BookOpenCheck,
  Bot,
  LayoutDashboard,
  MessageCircleQuestion,
  MessagesSquare,
  Palette,
  PenLine,
} from "lucide-react";
import Link from "next/link";

import { cn } from "cn";

export type SiteTab =
  | "overview"
  | "content"
  | "design"
  | "knowledge"
  | "questions"
  | "conversations"
  | "analytics"
  | "ai";

/** Tabs for a site's workspace pages. Scrolls sideways on small screens. */
export function SiteTabs({
  siteId,
  current,
  openQuestions,
}: {
  siteId: string;
  current: SiteTab;
  openQuestions?: number;
}) {
  const base = `/dashboard/sites/${siteId}`;
  const tabs = [
    { key: "overview", label: "Overview", href: base, Icon: LayoutDashboard },
    { key: "content", label: "Content", href: `${base}/setup/content`, Icon: PenLine },
    { key: "design", label: "Design", href: `${base}/design`, Icon: Palette },
    { key: "knowledge", label: "Knowledge Base", href: `${base}/knowledge`, Icon: BookOpenCheck },
    {
      key: "questions",
      label: "Questions",
      href: `${base}/questions`,
      Icon: MessageCircleQuestion,
    },
    {
      key: "conversations",
      label: "Conversations",
      href: `${base}/conversations`,
      Icon: MessagesSquare,
    },
    { key: "analytics", label: "Analytics", href: `${base}/analytics`, Icon: BarChart3 },
    { key: "ai", label: "AI & API", href: `${base}/ai`, Icon: Bot },
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

/** Small number card used on Overview and Analytics. */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-card/50 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Shared page frame for a site's workspace tab: back link, title, tabs. */
export function WorkspaceHeader({
  title,
  siteName,
  siteId,
  current,
  openQuestions,
}: {
  title: string;
  siteName: string;
  siteId: string;
  current: SiteTab;
  openQuestions?: number;
}) {
  return (
    <>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">
        {title}
        <span className="mt-1 block text-base font-normal text-muted-foreground sm:mt-0 sm:ml-2 sm:inline">
          {siteName}
        </span>
      </h1>
      <SiteTabs siteId={siteId} current={current} openQuestions={openQuestions} />
    </>
  );
}
