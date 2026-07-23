import Link from 'next/link';

/** Shared empty state for surfaces that need a signed-in principal. */
export function SignedOut({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-10 text-center">
      <p className="eyebrow">Sign in required</p>
      <p className="mt-3 text-muted-foreground">Sign in to {what}.</p>
      <Link
        href="/sign-in"
        className="mt-4 inline-block font-mono text-xs uppercase tracking-[0.16em] text-primary"
      >
        Go to sign in →
      </Link>
    </div>
  );
}
