import { ArrowUpRight } from "lucide-react";

import { FadeIn } from "@/components/fade-in";
import { TemplateSwatch } from "@/components/design/template-picker";
import { templates } from "@/lib/sites/templates";

/** "See it live": every template rendered with sample content, one click away. */
export function TemplateGallery() {
  return (
    <section id="templates" className="scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <FadeIn>
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            See it live
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Eight designs for portfolios and businesses. Each one is a real site rendered with
            sample content. Open any of them; you can switch designs later without losing a word.
          </p>
        </FadeIn>
        <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {templates.map((t) => (
            <li key={t.id}>
              <a
                href={`/templates/${t.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-2xl border border-white/10 bg-card/50 p-2 transition-colors hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <TemplateSwatch meta={t} />
                <span className="mt-2 flex items-center justify-between gap-2 px-1 text-sm font-medium">
                  {t.name}
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  />
                </span>
                <span className="block px-1 pb-1 text-xs text-muted-foreground">
                  {t.kind === "portfolio" ? "Portfolio" : "Business"} · {t.description}
                </span>
                <span className="sr-only">(opens a sample in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
