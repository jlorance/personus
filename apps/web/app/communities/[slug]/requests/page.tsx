import {
  ForbiddenError,
  listCommunityInvitations,
  listJoinRequests,
  NotFoundError,
} from '@personus/db/services';
import Link from 'next/link';
import { getPagePrincipal } from '@/lib/require-principal';
import {
  approveJoinRequestAction,
  createInvitationAction,
  declineJoinRequestAction,
} from './actions';

/**
 * Community admin panel — PER-8.
 *
 * Two surfaces on one page:
 *   - Pending join requests (approval communities) — approve or decline each.
 *   - Unclaimed invitation tokens (invite_only communities) — generate new ones
 *     and copy existing ones to share out-of-band.
 *
 * Non-admins see an access-denied message rather than a 403: the service throws
 * ForbiddenError which is caught here so the page degrades gracefully.
 */
export default async function CommunityRequestsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const principal = await getPagePrincipal();

  type Request = Awaited<ReturnType<typeof listJoinRequests>>[number];
  type Invitation = Awaited<ReturnType<typeof listCommunityInvitations>>[number];

  let requests: Request[] = [];
  let invitations: Invitation[] = [];
  let isAdmin = true;

  if (principal) {
    try {
      [requests, invitations] = await Promise.all([
        listJoinRequests(principal, slug).catch((e) => {
          if (e instanceof ForbiddenError || e instanceof NotFoundError) {
            isAdmin = false;
          }
          return [] as Request[];
        }),
        listCommunityInvitations(principal, slug).catch(() => [] as Invitation[]),
      ]);
    } catch {
      // DB unavailable — degrade to empty.
    }
  }

  return (
    <main className="shell py-14">
      <Link
        href={`/communities/${slug}/members`}
        className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
      >
        &larr; Members
      </Link>

      <p className="eyebrow mt-6">Admin panel</p>
      <h1 className="display mt-3 mb-8 text-4xl md:text-5xl">{slug}</h1>

      {!principal ? (
        <p className="text-muted-foreground">Sign in to manage this community.</p>
      ) : !isAdmin ? (
        <p className="text-muted-foreground">You are not an admin of this community.</p>
      ) : (
        <>
          {/* ── Join requests (approval communities) ── */}
          <section className="mb-12">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Join requests{requests.length > 0 ? ` (${requests.length} pending)` : ''}
            </h2>
            {requests.length === 0 ? (
              <p className="text-muted-foreground text-sm">No pending join requests.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {requests.map((req) => (
                  <div
                    key={req.publicId}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4"
                  >
                    <div>
                      <p className="font-medium">
                        <Link
                          href={`/p/${req.personaUri}`}
                          className="hover:text-primary hover:underline underline-offset-4"
                        >
                          {req.personaDisplayName}
                        </Link>
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        Requested {new Date(req.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <form action={approveJoinRequestAction}>
                        <input type="hidden" name="requestPublicId" value={req.publicId} />
                        <input type="hidden" name="slug" value={slug} />
                        <button
                          type="submit"
                          className="rounded-md bg-primary px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-primary/90"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={declineJoinRequestAction}>
                        <input type="hidden" name="requestPublicId" value={req.publicId} />
                        <input type="hidden" name="slug" value={slug} />
                        <button
                          type="submit"
                          className="rounded-md border border-border px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:border-destructive hover:text-destructive"
                        >
                          Decline
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Invitations (invite_only communities) ── */}
          <section className="max-w-xl rounded-lg border border-border bg-card p-6">
            <h2 className="display mb-2 text-xl">Invitations</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              For invite-only communities. Share a token with the person you want to invite — they
              redeem it via the &ldquo;Join by invite&rdquo; form on the communities page.
            </p>

            <form action={createInvitationAction} className="mb-6">
              <input type="hidden" name="slug" value={slug} />
              <button
                type="submit"
                className="h-10 rounded-md border border-border px-4 font-mono text-xs uppercase tracking-[0.12em] hover:border-primary hover:text-primary"
              >
                Generate invite token
              </button>
            </form>

            {invitations.length > 0 && (
              <>
                <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Unclaimed tokens
                </h3>
                <div className="flex flex-col gap-2">
                  {invitations.map((inv) => (
                    <div
                      key={inv.token}
                      className="flex items-center justify-between gap-3 rounded border border-border bg-background px-3 py-2"
                    >
                      <code className="break-all font-mono text-xs">{inv.token}</code>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </main>
  );
}
