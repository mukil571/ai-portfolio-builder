import { planSections, type StoredSection } from "@/lib/sites/render-plan";
import type { RenderableSection } from "@/lib/validation/sections";

import type { ProposedFact } from "./extract";

/**
 * Starter facts derived (without AI) from what the owner already typed into the
 * wizard. They are created as PROPOSED: the owner still reviews and approves each one.
 */
export function starterFactsFromSections(sections: readonly StoredSection[]): ProposedFact[] {
  const facts: ProposedFact[] = [];
  const add = (question: string, answer: string | undefined) => {
    if (answer && answer.trim()) facts.push({ question, answer: answer.trim() });
  };
  const list = (items: string[]) => items.filter(Boolean).join(", ");

  for (const section of planSections(sections) as RenderableSection[]) {
    switch (section.type) {
      case "hero": {
        const c = section.content;
        if (c.name && c.headline) add("What do you do?", `${c.headline}`);
        add("Where are you based?", c.location);
        break;
      }
      case "about":
        add("Tell me about yourself.", section.content.body?.split(/\n{2,}/)[0]);
        break;
      case "skills":
        add(
          "What skills do you have?",
          section.content.groups
            .map((g) => (g.name ? `${g.name}: ${list(g.items)}` : list(g.items)))
            .join("; "),
        );
        break;
      case "experience": {
        const [latest] = section.content.items;
        if (latest)
          add(
            "What is your current or most recent role?",
            `${latest.role} at ${latest.company}${latest.startDate ? ` (since ${latest.startDate})` : ""}.`,
          );
        break;
      }
      case "education":
        add(
          "What is your education?",
          section.content.items
            .map((e) => [e.degree, e.field, e.school].filter(Boolean).join(", "))
            .join("; "),
        );
        break;
      case "projects":
        add("What projects have you worked on?", list(section.content.items.map((p) => p.title)));
        break;
      case "services":
        add("What services do you offer?", list(section.content.items.map((s) => s.title)));
        for (const s of section.content.items) {
          if (s.price) add(`How much does ${s.title} cost?`, s.price);
        }
        break;
      case "pricing":
        for (const p of section.content.items) {
          add(
            `How much is the ${p.name} plan?`,
            `${p.price}${p.period ? ` per ${p.period}` : ""}.`,
          );
        }
        break;
      case "faq":
        for (const item of section.content.items) add(item.question, item.answer);
        break;
      case "contact": {
        const c = section.content;
        const ways = [c.email && `email ${c.email}`, c.phone && `call ${c.phone}`].filter(Boolean);
        if (ways.length) add("How can I contact you?", `You can ${ways.join(" or ")}.`);
        break;
      }
      default:
        break;
    }
  }
  return facts.map((f) => ({
    question: f.question.slice(0, 300),
    answer: f.answer.slice(0, 2000),
  }));
}
