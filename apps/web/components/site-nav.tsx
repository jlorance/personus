'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

const LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/coach', label: 'Coach' },
];

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="shell flex h-[60px] items-center justify-between">
        <Link href="/" className="font-mono text-sm font-bold tracking-[0.34em]">
          PERSON<span className="text-primary">US</span>
        </Link>
        <nav className="flex items-center gap-7">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                data-active={active}
                className="border-b border-transparent py-1 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground data-[active=true]:border-primary data-[active=true]:text-foreground"
              >
                {l.label}
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
