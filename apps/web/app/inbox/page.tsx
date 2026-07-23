import { listInbox } from '@personus/db/services';
import { SignedOut } from '@/components/signed-out';
import { getPagePrincipal } from '@/lib/require-principal';
import { respondAction } from './actions';

export default async function InboxPage() {
  const principal = await getPagePrincipal();

  let items: Awaited<ReturnType<typeof listInbox>> = [];
  if (principal) {
    try {
      items = await listInbox(principal);
    } catch {
      items = [];
    }
  }

  const pending = items.filter((i) => i.status === 'pending');
  const resolved = items.filter((i) => i.status !== 'pending');

  return (
    <main className="shell py-14">
      <p className="eyebrow">Mediated contact</p>
      <h1 className="display mt-3 mb-6 text-4xl md:text-5xl">Inbox</h1>

      {!principal ? (
        <SignedOut what="review introduction requests" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          No introduction requests yet. When someone asks to reach one of your personas, it lands
          here — with their reason, never their raw contact details.
        </div>
      ) : (
        <>
          {pending.map((i) => (
            <div key={i.publicId} className="ledger-row">
              <div className="ledger-row__idx mono">↳</div>
              <div>
                <div className="ledger-row__name text-2xl">{i.reason}</div>
                <p className="ledger-row__cap">
                  To {i.toPersonaUri} · from {i.fromPersonaUri ?? 'an anonymous visitor'}
                  {i.message ? ` — “${i.message}”` : ''}
                </p>
              </div>
              <div className="tally flex gap-2">
                <form action={respondAction}>
                  <input type="hidden" name="requestId" value={i.publicId} />
                  <input type="hidden" name="decision" value="approved" />
                  <button type="submit" className="text-primary hover:underline">
                    approve
                  </button>
                </form>
                <form action={respondAction}>
                  <input type="hidden" name="requestId" value={i.publicId} />
                  <input type="hidden" name="decision" value="declined" />
                  <button type="submit" className="text-muted-foreground hover:text-destructive">
                    decline
                  </button>
                </form>
              </div>
            </div>
          ))}

          {resolved.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
                Resolved
              </h2>
              {resolved.map((i) => (
                <div key={i.publicId} className="ledger-row opacity-60">
                  <div className="ledger-row__idx mono">{i.status === 'approved' ? '✓' : '×'}</div>
                  <div>
                    <div className="ledger-row__name text-2xl">{i.reason}</div>
                    <p className="ledger-row__cap">To {i.toPersonaUri}</p>
                  </div>
                  <div className="tally">{i.status}</div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
