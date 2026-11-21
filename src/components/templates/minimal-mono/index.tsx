import type { CSSProperties } from "react";

import { ChatWidget } from "@/components/chat/chat-widget";
import { SectionView, sectionTitles } from "@/components/sections";
import type { SiteView } from "@/lib/sites/types";
import type { SectionType } from "@/lib/validation/sections";

import { SITE_MODE_KEY } from "../mode-key";
import { ModeToggle } from "../mode-toggle";

const NAV_TYPES: SectionType[] = [
  "about",
  "projects",
  "services",
  "experience",
  "pricing",
  "contact",
];
const ROOT_ID = "site-root";

/**
 * "Minimal Mono" (portfolio): monochrome surfaces, Geist + Geist Mono, one owner accent,
 * numbered sections. Renders only the sections the planner kept.
 */
export function MinimalMonoSite({ site }: { site: SiteView }) {
  const defaultMode = site.theme.defaultMode ?? "light";
  const style = site.theme.accent
    ? ({ "--site-accent": site.theme.accent } as CSSProperties)
    : undefined;
  const hero = site.sections.find((s) => s.type === "hero");
  const displayName = (hero?.type === "hero" && hero.content.name) || site.name;
  const present = new Set(site.sections.map((s) => s.type));
  const nav = NAV_TYPES.filter((t) => present.has(t));
  let index = 0;

  return (
    <div
      id={ROOT_ID}
      data-template="minimal-mono"
      data-mode={defaultMode}
      style={style}
      className="site-root flex min-h-dvh flex-col font-sans antialiased"
    >
      {/* Apply a returning visitor's saved mode before paint (static string, no user data). */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var m=localStorage.getItem(${JSON.stringify(SITE_MODE_KEY)});if(m==="light"||m==="dark")document.getElementById(${JSON.stringify(ROOT_ID)}).dataset.mode=m}catch(e){}`,
        }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-site-fg focus:px-3 focus:py-2 focus:text-site-bg"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-site-border bg-site-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#home" className="truncate font-mono text-sm font-medium">
            {displayName}
          </a>
          <div className="flex items-center gap-1 sm:gap-4">
            <nav aria-label="Sections" className="hidden sm:block">
              <ul className="flex items-center gap-5 text-sm text-site-muted">
                {nav.map((t) => (
                  <li key={t}>
                    <a href={`#${t}`} className="transition-colors hover:text-site-fg">
                      {sectionTitles[t]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            {present.has("contact") ? (
              <a
                href="#contact"
                className="rounded-lg px-3 py-2 text-sm text-site-muted hover:text-site-fg sm:hidden"
              >
                Contact
              </a>
            ) : null}
            <ModeToggle rootId={ROOT_ID} />
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {site.sections.map((section) => (
          <SectionView
            key={section.type}
            section={section}
            index={section.type === "hero" ? 0 : ++index}
          />
        ))}
      </main>

      <footer className="border-t border-site-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8 text-xs text-site-muted sm:flex-row sm:justify-between sm:px-6">
          <p className="font-mono">© {displayName}</p>
          <p>
            Built with{" "}
            <a
              href="https://ai-portfolio-builder-czbe.vercel.app"
              className="underline underline-offset-4"
            >
              Loriyum
            </a>
          </p>
        </div>
      </footer>
      {site.assistant ? <ChatWidget slug={site.slug} owner={site.assistant.owner} /> : null}
    </div>
  );
}
