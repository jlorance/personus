import { listTraitMetadata } from '@personus/db/services';
import { getAdminPrincipal } from '../lib/require-admin';
import {
  createTraitMetadataAction,
  deleteTraitMetadataAction,
  updateTraitMetadataAction,
} from './actions';

const DATA_TYPES = ['string', 'array', 'number', 'boolean', 'object', 'date'] as const;

export default async function TraitMetadataPage() {
  const principal = await getAdminPrincipal();
  if (!principal) {
    return (
      <main className="shell">
        <h1>Trait metadata</h1>
        <div className="deny">Admin access required.</div>
      </main>
    );
  }

  let rows: Awaited<ReturnType<typeof listTraitMetadata>> = [];
  try {
    rows = await listTraitMetadata();
  } catch {
    rows = [];
  }

  return (
    <main className="shell">
      <h1>Trait metadata</h1>
      <p className="dim">Display and edit configuration for each trait key.</p>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Add trait metadata</h2>
        <form
          action={createTraitMetadataAction}
          className="panel"
          style={{ display: 'grid', gap: '0.75rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label
                htmlFor="tm-key"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Key (unique)
              </label>
              <input id="tm-key" type="text" name="key" placeholder="e.g. skills" required />
            </div>
            <div>
              <label
                htmlFor="tm-category"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Category
              </label>
              <input
                id="tm-category"
                type="text"
                name="category"
                placeholder="e.g. professional"
                required
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label
                htmlFor="tm-displayName"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Display name
              </label>
              <input
                id="tm-displayName"
                type="text"
                name="displayName"
                placeholder="e.g. Skills"
                required
              />
            </div>
            <div>
              <label
                htmlFor="tm-dataType"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Data type
              </label>
              <select id="tm-dataType" name="dataType">
                {DATA_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button type="submit">Add trait</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Existing ({rows.length})</h2>
        {rows.length === 0 ? (
          <div className="deny">No trait metadata — add one above.</div>
        ) : (
          <div className="panel">
            {rows.map((r) => (
              <div key={String(r.id)} className="row">
                <div>
                  <div className="k mono">{r.key}</div>
                  <div className="desc">
                    {r.category} · {r.dataType}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <form
                    action={updateTraitMetadataAction}
                    style={{ display: 'flex', gap: '0.5rem' }}
                  >
                    <input type="hidden" name="id" value={String(r.id)} />
                    <input
                      type="text"
                      name="displayName"
                      defaultValue={r.displayName}
                      style={{ minWidth: '160px' }}
                    />
                    <button type="submit">Save</button>
                  </form>
                  <form action={deleteTraitMetadataAction}>
                    <input type="hidden" name="id" value={String(r.id)} />
                    <button
                      type="submit"
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--danger)',
                        color: 'var(--danger)',
                      }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
