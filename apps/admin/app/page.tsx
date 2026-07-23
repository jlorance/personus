import Link from 'next/link';
import { getAdminPrincipal } from './lib/require-admin';

export default async function AdminHome() {
  const principal = await getAdminPrincipal();

  if (!principal) {
    return (
      <main className="shell">
        <h1>Admin</h1>
        <div className="deny">
          <p>You need the admin role to view this control plane.</p>
          <p className="dim">
            Access is granted through the configured auth provider (Clerk
            <code className="mono"> publicMetadata.role = &quot;admin&quot;</code>). When auth
            isn&apos;t configured in this environment, the admin surface is closed.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <h1>Control plane</h1>
      <p className="dim">Signed in as {principal.email ?? principal.actorId}.</p>
      <div style={{ marginTop: '1.5rem' }}>
        <Link href="/settings" className="card-link">
          <strong>System settings</strong>
          <div className="desc">Runtime configuration — AI models, limits, and more.</div>
        </Link>
        <Link href="/flags" className="card-link">
          <strong>Feature flags</strong>
          <div className="desc">Toggle features on and off without a deploy.</div>
        </Link>
      </div>
    </main>
  );
}
