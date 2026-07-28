import { listAllPlatformChannelBindings } from '@personus/db/services';
import { getAdminPrincipal } from '../lib/require-admin';
import { revokeChannelAction } from './actions';

const PLATFORM_LABELS: Record<string, string> = {
  slack: 'Slack',
  discord: 'Discord',
  telegram: 'Telegram',
};

export default async function PlatformChannelsPage() {
  const principal = await getAdminPrincipal();
  if (!principal) {
    return (
      <main className="shell">
        <h1>Platform channels</h1>
        <div className="deny">Admin access required.</div>
      </main>
    );
  }

  let bindings: Awaited<ReturnType<typeof listAllPlatformChannelBindings>> = [];
  try {
    bindings = await listAllPlatformChannelBindings(principal);
  } catch {
    bindings = [];
  }

  return (
    <main className="shell">
      <h1>Platform channels</h1>
      <p className="dim">
        Active bot bindings across all communities. Revoking removes the binding; the community
        admin must re-bind to restore it.
      </p>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
          Active bindings ({bindings.length})
        </h2>
        {bindings.length === 0 ? (
          <div className="deny">No active platform-channel bindings.</div>
        ) : (
          <div className="panel">
            {bindings.map((b) => (
              <div key={b.publicId} className="row">
                <div>
                  <div className="k">
                    {PLATFORM_LABELS[b.platform] ?? b.platform}{' '}
                    <span className="mono" style={{ fontSize: '0.85rem' }}>
                      {b.externalRef}
                    </span>
                  </div>
                  <div className="desc">Community {b.communityId}</div>
                  <div className="desc mono" style={{ fontSize: '0.75rem', marginTop: '0.15rem' }}>
                    {b.publicId}
                  </div>
                </div>
                <form action={revokeChannelAction}>
                  <input type="hidden" name="publicId" value={b.publicId} />
                  <button
                    type="submit"
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--danger)',
                      color: 'var(--danger)',
                    }}
                  >
                    Revoke
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
