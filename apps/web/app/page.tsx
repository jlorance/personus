import Link from 'next/link';
import { type LedgerEntry, LedgerRow } from '@/components/ledger-row';
import { Button } from '@/components/ui/button';

// Illustrative register entries for the landing preview (clearly labelled as such).
const SAMPLE: LedgerEntry[] = [
  {
    uri: 'per_mariaosei',
    displayName: 'Maria Osei',
    capability: 'Restores Victorian plumbing; teaches apprentices on weekends.',
    endorsements: 12,
  },
  {
    uri: 'per_dtanaka',
    displayName: 'Daniel Tanaka',
    capability: 'Ships Postgres-heavy backends; unusually calm in an incident.',
    endorsements: 7,
  },
  {
    uri: 'per_lenoir',
    displayName: 'Amélie Lenoir',
    capability: 'Turns messy field research into decisions people act on.',
    endorsements: 9,
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero shell border-b border-border py-20 md:py-24">
        <p className="eyebrow reveal">Capability, indexed</p>
        <h1 className="hero__thesis reveal">
          Your value is what you can <em>do</em>.
        </h1>
        <p className="hero__lede reveal max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
          Personus is a register of the capable — people indexed by what they can do and vouched for
          by those who&apos;ve seen them do it. Not a feed. A directory of trust.
        </p>
        <div className="reveal mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/coach">Build your persona</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore">Search the register</Link>
          </Button>
        </div>
      </section>

      <section className="shell py-14">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="display text-3xl">A glimpse of the register</h2>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            illustrative
          </span>
        </div>
        <div>
          {SAMPLE.map((e, i) => (
            <LedgerRow key={e.uri} index={i + 1} entry={e} />
          ))}
        </div>
      </section>
    </main>
  );
}
