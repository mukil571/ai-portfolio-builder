import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
            Loriyum
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Your website, with an AI that only says what you approved.
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="text-lg text-pretty text-muted-foreground">
            Publish a portfolio or business site. Visitors ask questions; anything the AI
            doesn&apos;t know comes to you, and once you answer, it knows forever.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <Button size="lg" disabled>
            Coming soon
          </Button>
        </FadeIn>
      </div>
    </main>
  );
}
