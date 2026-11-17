import { Check } from "lucide-react";
import Link from "next/link";

export const wizardSteps = [
  { id: "type", label: "Type" },
  { id: "template", label: "Template" },
  { id: "content", label: "Content" },
  { id: "knowledge", label: "Knowledge" },
  { id: "publish", label: "Publish" },
] as const;

export type WizardStepId = (typeof wizardSteps)[number]["id"];

/** Progress indicator. Steps after "template" link to the site's setup pages. */
export function Stepper({ current, siteId }: { current: WizardStepId; siteId?: string }) {
  const currentIndex = wizardSteps.findIndex((s) => s.id === current);
  return (
    <nav aria-label="Setup progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
        {wizardSteps.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const href = siteId && i >= 2 ? `/dashboard/sites/${siteId}/setup/${step.id}` : undefined;
          const label = (
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              <span
                aria-hidden="true"
                className="flex size-4 items-center justify-center font-mono text-[10px]"
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              {step.label}
            </span>
          );
          return (
            <li
              key={step.id}
              className="flex items-center gap-2"
              aria-current={active ? "step" : undefined}
            >
              {href && !active ? <Link href={href}>{label}</Link> : label}
              {i < wizardSteps.length - 1 ? (
                <span aria-hidden="true" className="h-px w-4 bg-white/15" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
