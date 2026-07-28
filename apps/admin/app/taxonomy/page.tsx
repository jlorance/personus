import { listTaxonomies } from '@personus/db/services';
import { getAdminPrincipal } from '../lib/require-admin';
import { createTaxonomyAction, deleteTaxonomyAction, updateTaxonomyAction } from './actions';

export default async function TaxonomyPage() {
  const principal = await getAdminPrincipal();
  if (!principal) {
    return (
      <main className="shell">
        <h1>Trait taxonomies</h1>
        <div className="deny">Admin access required.</div>
      </main>
    );
  }

  let rows: Awaited<ReturnType<typeof listTaxonomies>> = [];
  try {
    rows = await listTaxonomies();
  } catch {
    rows = [];
  }

  return (
    <main className="shell">
      <h1>Trait taxonomies</h1>
      <p className="dim">
        Suggested-value sets per trait key — used to drive pickers and autocomplete.
      </p>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Add taxonomy</h2>
        <form
          action={createTaxonomyAction}
          className="panel"
          style={{ display: 'grid', gap: '0.75rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label
                htmlFor="tx-traitKey"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Trait key
              </label>
              <input
                id="tx-traitKey"
                type="text"
                name="traitKey"
                placeholder="e.g. skills"
                required
              />
            </div>
            <div>
              <label
                htmlFor="tx-taxonomySlug"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Taxonomy slug
              </label>
              <input
                id="tx-taxonomySlug"
                type="text"
                name="taxonomySlug"
                placeholder="e.g. engineering"
                required
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="tx-displayName"
              className="desc"
              style={{ display: 'block', marginBottom: '0.25rem' }}
            >
              Display name
            </label>
            <input
              id="tx-displayName"
              type="text"
              name="displayName"
              placeholder="e.g. Engineering"
              style={{ width: '100%', minWidth: 'unset' }}
              required
            />
          </div>
          <div>
            <label
              htmlFor="tx-suggestedValues"
              className="desc"
              style={{ display: 'block', marginBottom: '0.25rem' }}
            >
              Suggested values (comma-separated)
            </label>
            <input
              id="tx-suggestedValues"
              type="text"
              name="suggestedValues"
              placeholder="TypeScript, Go, Rust"
              style={{ width: '100%', minWidth: 'unset' }}
            />
          </div>
          <div>
            <button type="submit">Add taxonomy</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Existing ({rows.length})</h2>
        {rows.length === 0 ? (
          <div className="deny">No taxonomies — add one above.</div>
        ) : (
          <div className="panel">
            {rows.map((r) => (
              <div key={String(r.id)} className="row">
                <div>
                  <div className="k mono">
                    {r.traitKey} / {r.taxonomySlug}
                  </div>
                  <div className="desc">{r.displayName}</div>
                  {r.suggestedValues.length > 0 && (
                    <div className="desc" style={{ marginTop: '0.2rem' }}>
                      {r.suggestedValues.join(', ')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <form action={updateTaxonomyAction} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="hidden" name="id" value={String(r.id)} />
                    <input
                      type="text"
                      name="displayName"
                      defaultValue={r.displayName}
                      style={{ minWidth: '160px' }}
                    />
                    <button type="submit">Save</button>
                  </form>
                  <form action={deleteTaxonomyAction}>
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
