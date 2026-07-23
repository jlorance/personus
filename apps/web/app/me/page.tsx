import { getOptionalPrincipal } from '@personus/auth/principal';
import { listMyPersonas } from '@personus/db/services';
import Link from 'next/link';
import { SignedOut } from '@/components/signed-out';
import { createPersonaAction, deletePersonaAction } from './actions';

export default async function MePage() {
  let principal = null;
  try {
    principal = await getOptionalPrincipal();
  } catch {
    principal = null;
  }

  let personas: Awaited<ReturnType<typeof listMyPersonas>> = [];
  if (principal) {
    try {
      personas = await listMyPersonas(principal);
    } catch {
      personas = [];
    }
  }

  return (
    <main className="shell py-14">
      <p className="eyebrow">Your entries</p>
      <h1 className="display mt-3 mb-6 text-4xl md:text-5xl">Your personas</h1>

      {!principal ? (
        <SignedOut what="manage your personas" />
      ) : (
        <>
          <section className="mb-10">
            {personas.length === 0 ? (
              <p className="text-muted-foreground">
                No personas yet. Create one below, or let the{' '}
                <Link href="/coach" className="text-primary underline-offset-4 hover:underline">
                  Persona Coach
                </Link>{' '}
                build one with you.
              </p>
            ) : (
              personas.map((p, i) => (
                <div key={p.uri} className="ledger-row">
                  <div className="ledger-row__idx">{String(i + 1).padStart(3, '0')}</div>
                  <div>
                    <div className="ledger-row__name">
                      <Link href={`/p/${p.uri}`}>{p.displayName}</Link>
                      <span className="ledger-row__uri">{p.uri}</span>
                    </div>
                    <p className="ledger-row__cap">{p.headline || 'No headline yet.'}</p>
                  </div>
                  <form action={deletePersonaAction} className="tally">
                    <input type="hidden" name="uri" value={p.uri} />
                    <button type="submit" className="hover:text-destructive">
                      {p.completenessScore}% · retire
                    </button>
                  </form>
                </div>
              ))
            )}
          </section>

          <section className="max-w-xl rounded-lg border border-border bg-card p-6">
            <h2 className="display mb-4 text-2xl">New persona</h2>
            <form action={createPersonaAction} className="flex flex-col gap-3">
              <input
                name="displayName"
                required
                placeholder="Display name"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <input
                name="headline"
                placeholder="One line — what you do"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <select
                name="visibility"
                defaultValue="community"
                className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              >
                <option value="public">Public</option>
                <option value="authenticated">Signed-in members</option>
                <option value="community">My communities</option>
                <option value="private">Private</option>
              </select>
              <button
                type="submit"
                className="h-11 rounded-md bg-primary font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"
              >
                Create persona
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
