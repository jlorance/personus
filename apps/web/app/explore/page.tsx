'use client';

import { Search } from 'lucide-react';
import { useActionState } from 'react';
import { LedgerRow } from '@/components/ledger-row';
import { type SearchState, searchAction } from './actions';

const INITIAL: SearchState = { query: '', results: [], ran: false };

export default function ExplorePage() {
  const [state, formAction, pending] = useActionState(searchAction, INITIAL);

  return (
    <main className="shell py-14">
      <p className="eyebrow">Query the register</p>
      <h1 className="display mt-3 mb-2 text-4xl md:text-5xl">Who can do what you need?</h1>
      <p className="mb-8 max-w-[56ch] text-muted-foreground">
        Describe the capability you&apos;re looking for — a skill, a service, a kind of person.
        Results are ranked by profile depth and shown with the trust that backs them.
      </p>

      <form action={formAction} className="flex items-center gap-3">
        <div className="flex h-11 flex-1 items-center gap-3 rounded-md border border-input bg-card px-4 focus-within:border-primary">
          <Search className="size-4 text-primary" aria-hidden />
          <input
            name="query"
            defaultValue={state.query}
            placeholder="a plumber who mentors; a calm backend engineer; a researcher who ships…"
            className="h-full flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search the register"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-primary px-5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? 'Searching…' : 'Search'}
        </button>
      </form>

      <section className="mt-10">
        {!state.ran && (
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Awaiting a query.
          </p>
        )}
        {state.ran && state.error && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            {state.error}
          </div>
        )}
        {state.ran && !state.error && state.results.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
            No one in the register matches “{state.query}” yet. Try broader words — or be the first
            to claim it.
          </div>
        )}
        {state.results.length > 0 && (
          <>
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              {state.results.length} in the register
            </div>
            {state.results.map((e, i) => (
              <LedgerRow key={e.uri} index={i + 1} entry={e} />
            ))}
          </>
        )}
      </section>
    </main>
  );
}
