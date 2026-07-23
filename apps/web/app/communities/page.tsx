import { listCommunities, listCommunityTypes, listMyPersonas } from '@personus/db/services';
import { SignedOut } from '@/components/signed-out';
import { getPagePrincipal } from '@/lib/require-principal';
import { createCommunityAction, joinCommunityAction, leaveCommunityAction } from './actions';

export default async function CommunitiesPage() {
  const principal = await getPagePrincipal();

  let communities: Awaited<ReturnType<typeof listCommunities>> = [];
  let personas: Awaited<ReturnType<typeof listMyPersonas>> = [];
  let types: Awaited<ReturnType<typeof listCommunityTypes>> = [];
  try {
    if (principal) {
      [communities, personas, types] = await Promise.all([
        listCommunities(principal),
        listMyPersonas(principal),
        listCommunityTypes(),
      ]);
    }
  } catch {
    // degrade to empty when the database isn't connected
  }

  return (
    <main className="shell py-14">
      <p className="eyebrow">Where the capable gather</p>
      <h1 className="display mt-3 mb-6 text-4xl md:text-5xl">Communities</h1>

      {!principal ? (
        <SignedOut what="see and found communities" />
      ) : (
        <>
          <section className="mb-10">
            {communities.length === 0 ? (
              <p className="text-muted-foreground">
                You&apos;re not in any communities yet. Found one below.
              </p>
            ) : (
              communities.map((c, i) => (
                <div key={c.slug} className="ledger-row">
                  <div className="ledger-row__idx">{String(i + 1).padStart(3, '0')}</div>
                  <div>
                    <div className="ledger-row__name text-2xl">{c.name}</div>
                    <p className="ledger-row__cap">
                      {c.communityType} · {c.memberCount ?? 0} member
                      {(c.memberCount ?? 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <form action={leaveCommunityAction} className="tally">
                    <input type="hidden" name="slug" value={c.slug} />
                    <button type="submit" className="hover:text-destructive">
                      leave
                    </button>
                  </form>
                </div>
              ))
            )}
          </section>

          {personas.length > 0 && (
            <section className="mb-6 max-w-xl rounded-lg border border-border bg-card p-6">
              <h2 className="display mb-4 text-2xl">Join by handle</h2>
              <form action={joinCommunityAction} className="flex flex-col gap-3 sm:flex-row">
                <input
                  name="slug"
                  required
                  placeholder="community-slug"
                  className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <select
                  name="personaUri"
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {personas.map((p) => (
                    <option key={p.uri} value={p.uri}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-11 rounded-md border border-border px-4 font-mono text-xs uppercase tracking-[0.12em] hover:border-primary hover:text-primary"
                >
                  Join
                </button>
              </form>
            </section>
          )}

          <section className="max-w-xl rounded-lg border border-border bg-card p-6">
            <h2 className="display mb-4 text-2xl">Found a community</h2>
            {personas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Create a persona first — a community is founded by one of your personas.
              </p>
            ) : (
              <form action={createCommunityAction} className="flex flex-col gap-3">
                <input
                  name="name"
                  required
                  placeholder="Community name"
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                />
                <select
                  name="communityType"
                  defaultValue="club"
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {(types.length > 0 ? types : [{ slug: 'club', name: 'Club' }]).map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  name="foundingPersonaUri"
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                >
                  {personas.map((p) => (
                    <option key={p.uri} value={p.uri}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="h-11 rounded-md bg-primary font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"
                >
                  Found community
                </button>
              </form>
            )}
          </section>
        </>
      )}
    </main>
  );
}
