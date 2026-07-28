import { getFeaturedMembers, listCommunityMembers } from '@personus/db/services';
import Link from 'next/link';
import { getPagePrincipal } from '@/lib/require-principal';
import { setMemberVisibilityAction } from './actions';

/**
 * Community member directory - PER-28.
 *
 * AC-1: Visible only to community members (the service returns [] for non-members).
 * AC-2: Featured members use getFeaturedMembers, which routes through the same
 *       visible-flag filter as listCommunityMembers - no surface bypasses it.
 * AC-3: Authenticated users can reach the visibility toggle from this page.
 * AC-4: Empty state is identical whether the caller is not a member or the
 *       community has no visible members - the page never makes an additional
 *       membership check that would distinguish the two cases.
 */
export default async function CommunityMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const principal = await getPagePrincipal();

  let members: Awaited<ReturnType<typeof listCommunityMembers>> = [];
  let featured: Awaited<ReturnType<typeof getFeaturedMembers>> = [];

  if (principal) {
    try {
      [members, featured] = await Promise.all([
        listCommunityMembers(principal, slug),
        getFeaturedMembers(principal, slug, 6),
      ]);
    } catch {
      // Degrade gracefully when the database is unavailable.
    }
  }

  return (
    <main className="shell py-14">
      <Link
        href="/communities"
        className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
      >
        &larr; Communities
      </Link>

      <p className="eyebrow mt-6">Member directory</p>
      <h1 className="display mt-3 mb-2 text-4xl md:text-5xl">{slug}</h1>

      {/* AC-3: Visibility toggle, shown to any authenticated user. The server
          action handles the ForbiddenError case (non-member) silently so this
          form does not disclose membership status. */}
      {principal && (
        <div className="mb-8 flex gap-3">
          <form action={setMemberVisibilityAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="visible" value="true" />
            <button
              type="submit"
              className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Appear in directory
            </button>
          </form>
          <span className="text-muted-foreground">&middot;</span>
          <form action={setMemberVisibilityAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="visible" value="false" />
            <button
              type="submit"
              className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
            >
              Hide from directory
            </button>
          </form>
        </div>
      )}

      {/* AC-2: Featured members draw from getFeaturedMembers, which applies the
          same visible filter as listCommunityMembers - no direct community_members
          query here or anywhere else on this surface. */}
      {featured.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Featured
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((m) => (
              <div key={m.uri} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      <Link
                        href={`/p/${m.uri}`}
                        className="hover:text-primary hover:underline underline-offset-4"
                      >
                        {m.displayName}
                      </Link>
                    </p>
                    {m.headline && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{m.headline}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{m.role}</span>
                </div>
                {m.endorsementCount > 0 && (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    {m.endorsementCount} endorsement{m.endorsementCount === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AC-1 + AC-4: The member list. listCommunityMembers returns [] for both
          non-members and communities with no visible members - the UI shows the
          same empty state for both and makes no additional membership check. */}
      <section>
        <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {members.length > 0 ? `All members (${members.length})` : 'Members'}
        </h2>

        {members.length === 0 ? (
          <p className="text-muted-foreground">
            {principal ? 'No members are listed here.' : 'Sign in to view this directory.'}
          </p>
        ) : (
          members.map((m, i) => (
            <div key={m.uri} className="ledger-row">
              <div className="ledger-row__idx">{String(i + 1).padStart(3, '0')}</div>
              <div>
                <div className="ledger-row__name">
                  <Link href={`/p/${m.uri}`}>{m.displayName}</Link>
                  <span className="ledger-row__uri">{m.role}</span>
                </div>
                <p className="ledger-row__cap">{m.headline ?? 'No headline.'}</p>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
