import Link from 'next/link';

export interface LedgerEntry {
  uri: string;
  displayName: string;
  capability: string;
  endorsements: number;
}

/** The signature element: a persona rendered as an entry in the capability register. */
export function LedgerRow({ index, entry }: { index: number; entry: LedgerEntry }) {
  const tally = entry.endorsements > 0 ? `${entry.endorsements} endorsed` : 'unendorsed';
  return (
    <Link href={`/p/${entry.uri}`} className="block">
      <div className="ledger-row">
        <div className="ledger-row__idx">{String(index).padStart(3, '0')}</div>
        <div>
          <div className="ledger-row__name">
            {entry.displayName}
            <span className="ledger-row__uri">{entry.uri}</span>
          </div>
          <p className="ledger-row__cap">{entry.capability}</p>
        </div>
        <div className="tally">
          <span className="tally__mark">{tally}</span>
        </div>
      </div>
    </Link>
  );
}
