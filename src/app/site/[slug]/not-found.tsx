import Link from "next/link";

export default function SiteNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">This site isn&apos;t available</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        It may not be published yet, or the address is wrong.
      </p>
      <Link href="/" className="mt-8 text-sm font-medium underline underline-offset-4">
        Go to Loriyum
      </Link>
    </main>
  );
}
