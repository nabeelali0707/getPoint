import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-on-surface flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center space-y-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">404</p>
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="text-sm text-on-surface-variant">
          The page you opened does not exist in GetPoint.
        </p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-on-primary"
        >
          Go home
        </Link>
      </section>
    </main>
  );
}
