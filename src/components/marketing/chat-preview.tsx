import { BadgeCheck, Inbox } from "lucide-react";

/** Static mock of the visitor chat, illustrating a verified answer and an escalated unknown. */
export function ChatPreview() {
  return (
    <div className="relative w-full max-w-md">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-[var(--brand-from)]/30 to-[var(--brand-to)]/20 blur-3xl"
      />
      <figure
        aria-label="Example chat between a visitor and an owner's site assistant"
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-card/80 shadow-2xl shadow-black/40 backdrop-blur"
      >
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
    </div>
  );
}

function Visitor({ children }: { children: React.ReactNode }) {
  return (
    <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground">
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
