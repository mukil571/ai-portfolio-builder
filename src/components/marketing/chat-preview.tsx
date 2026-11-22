import { BadgeCheck, Inbox } from "lucide-react";

/** Static mock of the visitor chat, illustrating a verified answer and an escalated unknown. */
export function ChatPreview() {
  return (
    <div className="relative w-full max-w-md">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[var(--brand-from)]/40 via-[var(--brand-via)]/20 to-[var(--brand-to)]/30 blur-3xl"
      />
      <figure
        aria-label="Example chat between a visitor and an owner's site assistant"
        className="glow-border relative overflow-hidden rounded-3xl shadow-2xl glass shadow-black/50"
      >
        <div
          aria-hidden="true"
          className="flex items-center gap-1.5 border-b border-white/5 bg-white/[0.02] px-4 py-2.5"
        >
          <span className="size-2.5 rounded-full bg-red-400/70" />
          <span className="size-2.5 rounded-full bg-amber-400/70" />
          <span className="size-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 truncate rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            loriyum.app/site/alex
          </span>
        </div>
        <div className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60 motion-reduce:animate-none" />
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
          </span>
          <div>
            <p className="text-sm font-medium">Ask Alex&apos;s assistant</p>
            <p className="text-xs text-muted-foreground">
              Answers only from Alex&apos;s approved facts
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5 text-sm">
          <Visitor>What&apos;s your hourly rate for React work?</Visitor>
          <Bot>
            $85/hour for freelance React and Next.js projects, with a 10-hour minimum.
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
              <BadgeCheck className="size-3.5" aria-hidden="true" />
              Verified by Alex
            </span>
          </Bot>
          <Visitor>Do you take Flutter projects?</Visitor>
          <Bot>
            I don&apos;t have that from Alex yet. I&apos;ve passed your question on. Want an email
            when Alex answers?
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--brand-from)]/15 px-2 py-0.5 text-xs font-medium text-[var(--brand-from)]">
              <Inbox className="size-3.5" aria-hidden="true" />
              Sent to owner&apos;s inbox
            </span>
          </Bot>
        </div>
      </figure>
      <div
        aria-hidden="true"
        className="absolute -top-5 -right-3 hidden aurora-blob items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium glass sm:flex"
      >
        <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
          <BadgeCheck className="size-3.5" />
        </span>
        100% owner-approved
      </div>
      <div
        aria-hidden="true"
        className="absolute -bottom-5 -left-4 hidden aurora-blob items-center gap-2 rounded-2xl px-3 py-2 text-xs font-medium glass [animation-delay:-6s] sm:flex"
      >
        <span className="flex size-6 items-center justify-center rounded-lg bg-brand text-white">
          <Inbox className="size-3.5" />
        </span>
        New question → your inbox
      </div>
    </div>
  );
}

function Visitor({ children }: { children: React.ReactNode }) {
  return (
    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-primary-foreground">
      {children}
    </p>
  );
}

function Bot({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex w-fit max-w-[90%] flex-col items-start rounded-2xl rounded-bl-md border border-white/5 bg-secondary px-4 py-2.5 leading-relaxed">
      {children}
    </p>
  );
}
