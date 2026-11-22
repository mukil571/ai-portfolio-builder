import type { SectionContent } from "@/lib/validation/sections";

import { dateRange, SectionShell, sectionTitles } from "./section-shell";

export function ExperienceSection({
  content,
  index,
}: {
  content: SectionContent<"experience">;
  index: number;
}) {
  return (
    <SectionShell id="experience" index={index} title={sectionTitles.experience}>
      <ol className="space-y-10">
        {content.items.map((item, i) => (
          <li key={`${item.company}-${i}`} className="grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-6">
            <div>
              <h3 className="font-medium">
                {item.role} <span className="text-site-muted">· {item.company}</span>
              </h3>
              {item.location ? <p className="text-sm text-site-muted">{item.location}</p> : null}
              {item.summary ? (
                <p className="mt-3 leading-relaxed text-pretty">{item.summary}</p>
              ) : null}
              {item.highlights.length ? (
                <ul className="mt-3 space-y-1.5 text-sm text-site-muted">
                  {item.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span aria-hidden="true" className="text-site-accent-ink">
                        —
                      </span>
                      {h}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="order-first font-mono text-xs text-site-muted sm:order-none sm:pt-1">
              {dateRange(item.startDate, item.endDate)}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

export function EducationSection({
  content,
  index,
}: {
  content: SectionContent<"education">;
  index: number;
}) {
  return (
    <SectionShell id="education" index={index} title={sectionTitles.education}>
      <ol className="space-y-8">
        {content.items.map((item, i) => {
          const degree = [item.degree, item.field].filter(Boolean).join(", ");
          return (
            <li key={`${item.school}-${i}`} className="grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-6">
              <div>
                <h3 className="font-medium">{item.school}</h3>
                {degree ? <p className="text-site-muted">{degree}</p> : null}
                {item.summary ? (
                  <p className="mt-2 text-sm leading-relaxed">{item.summary}</p>
                ) : null}
              </div>
              <p className="order-first font-mono text-xs text-site-muted sm:order-none sm:pt-1">
                {dateRange(item.startDate, item.endDate)}
              </p>
            </li>
          );
        })}
      </ol>
    </SectionShell>
  );
}
