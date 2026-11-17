import type { SectionContent } from "@/lib/validation/sections";

import { SectionShell, sectionTitles, Tag } from "./section-shell";

type Props<T extends "about" | "skills" | "faq"> = { content: SectionContent<T>; index: number };

export function AboutSection({ content, index }: Props<"about">) {
  return (
    <SectionShell id="about" index={index} title={content.heading ?? sectionTitles.about}>
      <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-pretty">
        {content.body?.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </SectionShell>
  );
}

export function SkillsSection({ content, index }: Props<"skills">) {
  return (
    <SectionShell id="skills" index={index} title={content.heading ?? sectionTitles.skills}>
      <div className="space-y-6">
        {content.groups.map((group, i) => (
          <div key={group.name ?? i}>
            {group.name ? <h3 className="mb-3 text-sm font-medium">{group.name}</h3> : null}
            <ul className="flex flex-wrap gap-2" aria-label={group.name ?? "Skills"}>
              {group.items.map((item) => (
                <li key={item}>
                  <Tag>{item}</Tag>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function FaqSection({ content, index }: Props<"faq">) {
  return (
    <SectionShell id="faq" index={index} title={sectionTitles.faq}>
      <div className="divide-y divide-site-border border-y border-site-border">
        {content.items.map((item) => (
          <details key={item.question} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden="true"
                className="font-mono text-site-muted transition-transform group-open:rotate-45 motion-reduce:transition-none"
              >
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-site-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}
