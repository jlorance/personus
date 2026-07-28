import { listCommunityTypes } from '@personus/db/services';
import { getAdminPrincipal } from '../lib/require-admin';
import {
  createCommunityTypeAction,
  deleteCommunityTypeAction,
  toggleCommunityTypeAction,
  updateCommunityTypeAction,
} from './actions';

export default async function CommunityTypesPage() {
  const principal = await getAdminPrincipal();
  if (!principal) {
    return (
      <main className="shell">
        <h1>Community types</h1>
        <div className="deny">Admin access required.</div>
      </main>
    );
  }

  let rows: Awaited<ReturnType<typeof listCommunityTypes>> = [];
  try {
    rows = await listCommunityTypes();
  } catch {
    rows = [];
  }

  return (
    <main className="shell">
      <h1>Community types</h1>
      <p className="dim">Reference types that define the shape and defaults for communities.</p>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Add community type</h2>
        <form
          action={createCommunityTypeAction}
          className="panel"
          style={{ display: 'grid', gap: '0.75rem' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label
                htmlFor="ct-slug"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Slug (unique)
              </label>
              <input
                id="ct-slug"
                type="text"
                name="slug"
                placeholder="e.g. professional-network"
                required
              />
            </div>
            <div>
              <label
                htmlFor="ct-name"
                className="desc"
                style={{ display: 'block', marginBottom: '0.25rem' }}
              >
                Name
              </label>
              <input
                id="ct-name"
                type="text"
                name="name"
                placeholder="e.g. Professional Network"
                required
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="ct-description"
              className="desc"
              style={{ display: 'block', marginBottom: '0.25rem' }}
            >
              Description (optional)
            </label>
            <input
              id="ct-description"
              type="text"
              name="description"
              placeholder="Brief description"
              style={{ width: '100%', minWidth: 'unset' }}
            />
          </div>
          <div>
            <button type="submit">Add type</button>
          </div>
        </form>
      </section>

      <section style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Existing ({rows.length})</h2>
        {rows.length === 0 ? (
          <div className="deny">No community types — add one above.</div>
        ) : (
          <div className="panel">
            {rows.map((r) => (
              <div key={String(r.id)} className="row">
                <div>
                  <div className="k mono">{r.slug}</div>
                  {r.description && <div className="desc">{r.description}</div>}
                  <div className="desc" style={{ marginTop: '0.15rem' }}>
                    {r.isActive ? 'Active' : 'Inactive'} · order {r.displayOrder}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <form
                    action={updateCommunityTypeAction}
                    style={{ display: 'flex', gap: '0.5rem' }}
                  >
                    <input type="hidden" name="id" value={String(r.id)} />
                    <input
                      type="text"
                      name="name"
                      defaultValue={r.name}
                      style={{ minWidth: '160px' }}
                    />
                    <button type="submit">Save</button>
                  </form>
                  <form action={toggleCommunityTypeAction}>
                    <input type="hidden" name="id" value={String(r.id)} />
                    <input type="hidden" name="isActive" value={(!r.isActive).toString()} />
                    <button type="submit" className="toggle" data-on={r.isActive}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </form>
                  <form action={deleteCommunityTypeAction}>
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
