import { listSystemSettings } from '@personus/db/services';
import { getAdminPrincipal } from '../lib/require-admin';
import { toggleFlagAction } from './actions';

export default async function FlagsPage() {
  const principal = await getAdminPrincipal();
  if (!principal) {
    return (
      <main className="shell">
        <h1>Feature flags</h1>
        <div className="deny">Admin access required.</div>
      </main>
    );
  }

  let flags: Awaited<ReturnType<typeof listSystemSettings>> = [];
  try {
    flags = (await listSystemSettings(principal, 'features')).filter(
      (s) => s.valueType === 'boolean',
    );
  } catch {
    flags = [];
  }

  return (
    <main className="shell">
      <h1>Feature flags</h1>
      <p className="dim">Toggle features without a deploy. Effective within ~60 seconds.</p>

      {flags.length === 0 ? (
        <div className="deny" style={{ marginTop: '1rem' }}>
          No flags loaded — connect a database and seed to populate them.
        </div>
      ) : (
        <div className="panel" style={{ marginTop: '1rem' }}>
          {flags.map((f) => {
            const on = f.value === true;
            return (
              <div key={f.key} className="row">
                <div>
                  <div className="k mono">{f.key}</div>
                  {f.description && <div className="desc">{f.description}</div>}
                </div>
                <form action={toggleFlagAction}>
                  <input type="hidden" name="key" value={f.key} />
                  <input type="hidden" name="next" value={(!on).toString()} />
                  <button type="submit" className="toggle" data-on={on}>
                    {on ? 'On' : 'Off'}
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
