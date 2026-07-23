import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personus Admin',
  description: 'Control plane',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="admin-nav">
          <Link href="/" className="brand">
            PERSON<span>US</span> admin
          </Link>
          <Link href="/settings">Settings</Link>
          <Link href="/flags">Feature flags</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
