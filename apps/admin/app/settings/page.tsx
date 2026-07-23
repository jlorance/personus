import { listSystemSettings } from '@personus/db/services';
import { getAdminPrincipal } from '../lib/require-admin';
import { updateSettingAction } from './actions';

export default async function SettingsPage() {
  const principal = await getAdminPrincipal();
  if (!principal) {
    return (
      <main className="shell">
        <h1>Settings</h1>
        <div className="deny">Admin access required.</div>
      </main>
    );
  }

  let settings: Awaited<ReturnType<typeof listSystemSettings>> = [];
  try {
    settings = await listSystemSettings(principal);
  } catch {
    settings = [];
  }

  // Group by category, excluding the feature flags (those live on /flags).
  const byCategory = new Map<string, typeof settings>();
  for (const s of settings) {
    if (s.category === 'features') continue;
    const list = byCategory.get(s.category) ?? [];
    list.push(s);
    byCategory.set(s.category, list);
  }

  return (
    <main className="shell">
      <h1>System settings</h1>
      <p className="dim">Changes take effect within ~60 seconds (cache TTL).</p>

      {settings.length === 0 && (
        <div className="deny" style={{ marginTop: '1rem' }}>
          No settings loaded — connect a database and seed to populate them.
        </div>
      )}

      {[...byCategory.entries()].map(([category, list]) => (
        <section key={category} style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', textTransform: 'capitalize' }}>{category}</h2>
          <div className="panel">
            {list.map((s) => (
              <form key={s.key} action={updateSettingAction} className="row">
                <div>
                  <div className="k mono">{s.key}</div>
                  {s.description && <div className="desc">{s.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="hidden" name="key" value={s.key} />
                  <input
                    type={s.valueType === 'number' ? 'number' : 'text'}
                    name="value"
                    defaultValue={
                      typeof s.value === 'object' ? JSON.stringify(s.value) : String(s.value)
                    }
                  />
                  <button type="submit">Save</button>
                </div>
              </form>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
