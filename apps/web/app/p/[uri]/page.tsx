import { getAnonymousMcpPrincipal, getOptionalPrincipal } from '@personus/auth/principal';
import { getPersonaByUri } from '@personus/db/services';
import Link from 'next/link';

/** Public persona page. Visibility-gated; degrades gracefully with no database. */
export default async function PersonaPage({ params }: { params: Promise<{ uri: string }> }) {
  const { uri } = await params;

  let persona: Awaited<ReturnType<typeof getPersonaByUri>> = null;
  try {
    const principal =
      (await getOptionalPrincipal()) ?? getAnonymousMcpPrincipal(new Request('http://local/p'));
    persona = await getPersonaByUri(principal, uri);
  } catch {
    persona = null;
  }

  if (!persona) {
    return (
      <main className="shell py-20">
        <p className="eyebrow">Not in the register</p>
        <h1 className="display mt-3 mb-4 text-4xl">Nothing filed under {uri}</h1>
        <p className="mb-6 max-w-[52ch] text-muted-foreground">
          This entry isn&apos;t published, isn&apos;t visible to you, or the register isn&apos;t
          connected yet.
        </p>
        <Link
          href="/explore"
          className="font-mono text-xs uppercase tracking-[0.16em] text-primary"
        >
          ← Back to the register
        </Link>
      </main>
    );
  }

  const traits = (persona.traits ?? {}) as Record<string, unknown>;
  const skills = Array.isArray(traits.skills)
    ? (traits.skills as Array<{ name?: string } | string>)
    : [];

  return (
    <main className="shell py-16">
      <p className="eyebrow">{persona.entityType === 'organization' ? 'Organization' : 'Person'}</p>
      <h1 className="display mt-3 text-5xl md:text-6xl">{persona.displayName}</h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {persona.uri} · completeness {persona.completenessScore ?? 0}%
      </p>
      {persona.headline && (
        <p className="mt-6 max-w-[60ch] text-lg text-foreground">{persona.headline}</p>
      )}

      {skills.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Capabilities
          </h2>
          <div className="flex flex-wrap gap-2">
            {skills.map((s, i) => {
              const name = typeof s === 'string' ? s : (s.name ?? '');
              return (
                <span
                  key={`${name}-${i}`}
                  className="rounded-md border border-border bg-card px-3 py-1 text-sm"
                >
                  {name}
                </span>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
